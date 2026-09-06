import { prisma } from "../lib/prisma";


const FREQUENCY_CAP = 3;
const FREQUENCY_WINDOW_HOURS = 1;


export async function hasReachedFrequencyCap(
  userId: string,
  campaignId: number
): Promise<boolean> {
  const windowStart = new Date(
    Date.now() - FREQUENCY_WINDOW_HOURS * 60 * 60 * 1000
  );

  const impressionCount = await prisma.adEvent.count({
    where: {
      userId,
      campaignId,
      eventType: "impression",
      createdAt: {
        gte: windowStart,
      },
    },
  });

  return impressionCount >= FREQUENCY_CAP;
}


export async function getDailySpend(
  campaignId: number
): Promise<number> {
  const now = new Date();

  const dayStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )
  );

  const result = await prisma.adEvent.aggregate({
    where: {
      campaignId,
      eventType: "impression",
      createdAt: {
        gte: dayStart,
      },
    },
    _sum: {
      cost: true,
    },
  });

  return result._sum.cost ?? 0;
}


export async function selectAd(request: {
  userId: string;
  country: string;
  device: string;
  category?: string;
}) {
  const candidates = await prisma.campaign.findMany({
    where: {
      isActive: true,

      country: request.country,
      device: request.device,

      ...(request.category !== undefined
        ? { category: request.category }
        : {}),
    },

    orderBy: {
      bidPrice: "desc",
    },
  });

  for (const campaign of candidates) {
  if (
    campaign.spent + campaign.bidPrice >
    campaign.totalBudget
  ) {
    continue;
  }

  const dailySpend = await getDailySpend(
    campaign.id
  );

  if (
    dailySpend + campaign.bidPrice >
    campaign.dailyBudget
  ) {
    continue;
  }

  const capped = await hasReachedFrequencyCap(
    request.userId,
    campaign.id
  );

  if (!capped) {
    return campaign;
  }
}

  return null;
}
import { prisma } from "../lib/prisma.js";
import { AD_CONFIG } from "../config/ad.config.js";

export async function hasReachedFrequencyCap(
  userId: string,
  campaignId: number
): Promise<boolean> {
  const windowStart = new Date(
    Date.now() -
      AD_CONFIG.frequencyWindowHours * 60 * 60 * 1000
  );

  const impressionCount = await prisma.adEvent.count({
    where: {
      userId,
      campaignId,
      eventType: "impression",
      createdAt: { gte: windowStart },
    },
  });

  return impressionCount >= AD_CONFIG.frequencyCap;
}

export async function getDailySpend(
  campaignId: number
): Promise<bigint> {
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
      createdAt: { gte: dayStart },
    },
    _sum: {
      costMicros: true,
    },
  });

  return result._sum.costMicros ?? 0n;
}

export async function selectAd(request: {
  userId: string;
  country: string;
  device: string;
  category?: string | undefined;
}) {
  const categoryFilter =
    request.category !== undefined
      ? {
          OR: [
            { category: null },
            { category: request.category },
          ],
        }
      : { category: null };

  const candidates = await prisma.campaign.findMany({
    where: {
      isActive: true,
      country: request.country,
      device: request.device,
      ...categoryFilter,
    },
    orderBy: [
      { bidPriceMicros: "desc" },
      { id: "asc" },
    ],
  });

  for (const campaign of candidates) {
    if (
      campaign.spentMicros + campaign.bidPriceMicros >
      campaign.totalBudgetMicros
    ) {
      continue;
    }

    const dailySpend = await getDailySpend(campaign.id);

    if (
      dailySpend + campaign.bidPriceMicros >
      campaign.dailyBudgetMicros
    ) {
      continue;
    }

    const capped = await hasReachedFrequencyCap(
      request.userId,
      campaign.id
    );

    if (!capped) return campaign;
  }

  return null;
}
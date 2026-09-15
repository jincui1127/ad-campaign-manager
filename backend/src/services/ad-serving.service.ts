import { prisma } from "../lib/prisma.js";
import { AD_CONFIG } from "../config/ad.config.js";

function getUtcDayStart(): Date {
  const now = new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )
  );
}

function getFrequencyWindowStart(): Date {
  return new Date(
    Date.now() -
      AD_CONFIG.frequencyWindowHours * 60 * 60 * 1000
  );
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
            { categories: { isEmpty: true } },
            { categories: { has: request.category } },
          ],
        }
      : {
          categories: { isEmpty: true },
        };

  const candidates = await prisma.campaign.findMany({
    where: {
      isActive: true,
      AND: [
        {
          OR: [
            { countries: { isEmpty: true } },
            { countries: { has: request.country } },
          ],
        },
        {
          OR: [
            { devices: { isEmpty: true } },
            { devices: { has: request.device } },
          ],
        },
        categoryFilter,
      ],
    },
    orderBy: [
      { bidPriceMicros: "desc" },
      { id: "asc" },
    ],
  });

  if (candidates.length === 0) {
    return null;
  }

  const candidateIds = candidates.map(
    (campaign) => campaign.id
  );

  const dayStart = getUtcDayStart();
  const frequencyWindowStart =
    getFrequencyWindowStart();

  const [dailySpendRows, frequencyRows] =
    await Promise.all([
      prisma.adEvent.groupBy({
        by: ["campaignId"],
        where: {
          campaignId: {
            in: candidateIds,
          },
          createdAt: {
            gte: dayStart,
          },
        },
        _sum: {
          costMicros: true,
        },
      }),

      prisma.adEvent.groupBy({
        by: ["campaignId"],
        where: {
          campaignId: {
            in: candidateIds,
          },
          userId: request.userId,
          eventType: "impression",
          createdAt: {
            gte: frequencyWindowStart,
          },
        },
        _count: {
          _all: true,
        },
      }),
    ]);

  const dailySpendByCampaign =
    new Map<number, bigint>();

  for (const row of dailySpendRows) {
    dailySpendByCampaign.set(
      row.campaignId,
      row._sum.costMicros ?? 0n
    );
  }

  const frequencyByCampaign =
    new Map<number, number>();

  for (const row of frequencyRows) {
    frequencyByCampaign.set(
      row.campaignId,
      row._count._all
    );
  }

  for (const campaign of candidates) {
    if (
      campaign.spentMicros +
        campaign.bidPriceMicros >
      campaign.totalBudgetMicros
    ) {
      continue;
    }

    const dailySpend =
      dailySpendByCampaign.get(
        campaign.id
      ) ?? 0n;

    if (
      dailySpend +
        campaign.bidPriceMicros >
      campaign.dailyBudgetMicros
    ) {
      continue;
    }

    const impressionCount =
      frequencyByCampaign.get(
        campaign.id
      ) ?? 0;

    if (
      impressionCount >=
      AD_CONFIG.frequencyCap
    ) {
      continue;
    }

    return campaign;
  }

  return null;
}
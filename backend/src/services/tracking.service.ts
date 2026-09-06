import { prisma } from "../lib/prisma";
import {
  getDailySpend,
  hasReachedFrequencyCap,
} from "./ad-serving.service";



type AdEventInput = {
  eventId: string;
  campaignId: number;
  userId: string;
};


export async function recordImpression(
  event: AdEventInput
) {
  const existingEvent = await prisma.adEvent.findUnique({
    where: {
      eventId: event.eventId,
    },
  });

  if (existingEvent) {
    return existingEvent;
  }

  const campaign = await prisma.campaign.findUnique({
    where: {
      id: event.campaignId,
    },
  });

  if (!campaign) {
    return null;
  }

  if (!campaign.isActive) {
    return null;
  }

  const capped = await hasReachedFrequencyCap(
    event.userId,
    event.campaignId
  );

  if (capped) {
    return null;
  }

  if (
    campaign.spent + campaign.bidPrice >
    campaign.totalBudget
  ) {
    return null;
  }

  const dailySpend = await getDailySpend(
    event.campaignId
  );

  if (
    dailySpend + campaign.bidPrice >
    campaign.dailyBudget
  ) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const newEvent = await tx.adEvent.create({
      data: {
        eventId: event.eventId,
        campaignId: event.campaignId,
        userId: event.userId,
        eventType: "impression",
        cost: campaign.bidPrice,
      },
    });

    await tx.campaign.update({
      where: {
        id: event.campaignId,
      },
      data: {
        impressions: {
          increment: 1,
        },
        spent: {
          increment: campaign.bidPrice,
        },
      },
    });

    return newEvent;
  });
}


export async function recordClick(
  event: AdEventInput
) {
  const existingEvent = await prisma.adEvent.findUnique({
    where: {
      eventId: event.eventId,
    },
  });

  if (existingEvent) {
    return existingEvent;
  }

  const campaign = await prisma.campaign.findUnique({
    where: {
      id: event.campaignId,
    },
  });

  if (!campaign) {
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const newEvent = await tx.adEvent.create({
      data: {
        eventId: event.eventId,
        campaignId: event.campaignId,
        userId: event.userId,
        eventType: "click",
        cost: 0,
      },
    });

    await tx.campaign.update({
      where: {
        id: event.campaignId,
      },
      data: {
        clicks: {
          increment: 1,
        },
      },
    });

    return newEvent;
  });
}
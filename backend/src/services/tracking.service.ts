import { prisma } from "../lib/prisma";
import {
  getDailySpend,
  hasReachedFrequencyCap,
} from "./ad-serving.service";
import { Prisma } from "../generated/prisma/client";

const MAX_TRANSACTION_RETRIES = 3;

type AdEventInput = {
  eventId: string;
  campaignId: number;
  userId: string;
};


export async function recordImpression(
  event: AdEventInput
) {
  for (
    let attempt = 1;
    attempt <= MAX_TRANSACTION_RETRIES;
    attempt++
  ) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          // 1. Prevent duplicate events
          const existingEvent =
            await tx.adEvent.findUnique({
              where: {
                eventId: event.eventId,
              },
            });

          if (existingEvent) {
            return existingEvent;
          }

          // 2. Load campaign
          const campaign =
            await tx.campaign.findUnique({
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

          // 3. Frequency cap
          const windowStart = new Date(
            Date.now() - 60 * 60 * 1000
          );

          const impressionCount =
            await tx.adEvent.count({
              where: {
                campaignId: event.campaignId,
                userId: event.userId,
                eventType: "impression",
                createdAt: {
                  gte: windowStart,
                },
              },
            });

          if (impressionCount >= 3) {
            return null;
          }

          // 4. Total budget
          if (
            campaign.spent + campaign.bidPrice >
            campaign.totalBudget
          ) {
            return null;
          }

          // 5. Daily budget
          const now = new Date();

          const dayStart = new Date(
            Date.UTC(
              now.getUTCFullYear(),
              now.getUTCMonth(),
              now.getUTCDate()
            )
          );

          const dailySpendResult =
            await tx.adEvent.aggregate({
              where: {
                campaignId: event.campaignId,
                eventType: "impression",
                createdAt: {
                  gte: dayStart,
                },
              },

              _sum: {
                cost: true,
              },
            });

          const dailySpend =
            dailySpendResult._sum.cost ?? 0;

          if (
            dailySpend + campaign.bidPrice >
            campaign.dailyBudget
          ) {
            return null;
          }

          // 6. Create impression event
          const newEvent =
            await tx.adEvent.create({
              data: {
                eventId: event.eventId,
                campaignId: event.campaignId,
                userId: event.userId,
                eventType: "impression",
                cost: campaign.bidPrice,
              },
            });

          // 7. Update campaign metrics
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
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel
              .Serializable,
        }
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError
      ) {
        if (error.code === "P2002") {
          return prisma.adEvent.findUnique({
            where: {
              eventId: event.eventId,
            },
          });
        }

        if (
          error.code === "P2034" &&
          attempt < MAX_TRANSACTION_RETRIES
        ) {
          continue;
        }
      }

      throw error;
    }
  }

  throw new Error(
    "Transaction failed after maximum retries"
  );
}


export async function recordClick(
  event: AdEventInput
) {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const existingEvent =
          await tx.adEvent.findUnique({
            where: {
              eventId: event.eventId,
            },
          });

        if (existingEvent) {
          return existingEvent;
        }

        const campaign =
          await tx.campaign.findUnique({
            where: {
              id: event.campaignId,
            },
          });

        if (!campaign) {
          return null;
        }

        const newEvent =
          await tx.adEvent.create({
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
      }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return prisma.adEvent.findUnique({
        where: {
          eventId: event.eventId,
        },
      });
    }

    throw error;
  }
}
import { prisma } from "../lib/prisma.js";

import {
  Prisma,
} from "../generated/prisma/client.js";

import type {
  AdEvent,
} from "../generated/prisma/client.js";

import {
  AD_CONFIG,
} from "../config/ad.config.js";


const MAX_TRANSACTION_RETRIES = 3;


type AdEventInput = {
  eventId: string;
  campaignId: number;
  userId: string;
};


export type TrackingFailureReason =
  | "CAMPAIGN_NOT_FOUND"
  | "CAMPAIGN_PAUSED"
  | "FREQUENCY_CAP_REACHED"
  | "TOTAL_BUDGET_EXHAUSTED"
  | "DAILY_BUDGET_EXHAUSTED"
  | "NO_PRIOR_IMPRESSION";


type TrackingSuccess = {
  ok: true;
  event: AdEvent;
  deduped: boolean;
};


type TrackingFailure = {
  ok: false;
  reason: TrackingFailureReason;
};


export type TrackingResult =
  | TrackingSuccess
  | TrackingFailure;


export async function recordImpression(
  event: AdEventInput
): Promise<TrackingResult> {
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
                eventId:
                  event.eventId,
              },
            });

          if (existingEvent) {
            return {
              ok: true,
              event: existingEvent,
              deduped: true,
            };
          }

          // 2. Load campaign
          const campaign =
            await tx.campaign.findUnique({
              where: {
                id: event.campaignId,
              },
            });

          if (!campaign) {
            return {
              ok: false,
              reason:
                "CAMPAIGN_NOT_FOUND",
            };
          }

          if (!campaign.isActive) {
            return {
              ok: false,
              reason:
                "CAMPAIGN_PAUSED",
            };
          }

          // 3. Frequency cap
          const windowStart =
            new Date(
              Date.now() -
                AD_CONFIG
                  .frequencyWindowHours *
                  60 *
                  60 *
                  1000
            );

          const impressionCount =
            await tx.adEvent.count({
              where: {
                campaignId:
                  event.campaignId,

                userId:
                  event.userId,

                eventType:
                  "impression",

                createdAt: {
                  gte: windowStart,
                },
              },
            });

          if (
            impressionCount >=
            AD_CONFIG.frequencyCap
          ) {
            return {
              ok: false,
              reason:
                "FREQUENCY_CAP_REACHED",
            };
          }

          // 4. Total budget
          if (
            campaign.spent +
              campaign.bidPrice >
            campaign.totalBudget
          ) {
            return {
              ok: false,
              reason:
                "TOTAL_BUDGET_EXHAUSTED",
            };
          }

          // 5. Daily budget
          const now = new Date();

          const dayStart =
            new Date(
              Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate()
              )
            );

          const dailySpendResult =
            await tx.adEvent.aggregate({
              where: {
                campaignId:
                  event.campaignId,

                eventType:
                  "impression",

                createdAt: {
                  gte: dayStart,
                },
              },

              _sum: {
                cost: true,
              },
            });

          const dailySpend =
            dailySpendResult._sum
              .cost ?? 0;

          if (
            dailySpend +
              campaign.bidPrice >
            campaign.dailyBudget
          ) {
            return {
              ok: false,
              reason:
                "DAILY_BUDGET_EXHAUSTED",
            };
          }

          // 6. Create impression
          const newEvent =
            await tx.adEvent.create({
              data: {
                eventId:
                  event.eventId,

                campaignId:
                  event.campaignId,

                userId:
                  event.userId,

                eventType:
                  "impression",

                cost:
                  campaign.bidPrice,
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
                increment:
                  campaign.bidPrice,
              },
            },
          });

          return {
            ok: true,
            event: newEvent,
            deduped: false,
          };
        },
        {
          isolationLevel:
            Prisma
              .TransactionIsolationLevel
              .Serializable,
        }
      );
    } catch (error) {
      if (
        error instanceof
        Prisma.PrismaClientKnownRequestError
      ) {
        if (error.code === "P2002") {
          const existingEvent =
            await prisma.adEvent.findUnique({
              where: {
                eventId:
                  event.eventId,
              },
            });

          if (existingEvent) {
            return {
              ok: true,
              event: existingEvent,
              deduped: true,
            };
          }
        }

        if (
          error.code === "P2034" &&
          attempt <
            MAX_TRANSACTION_RETRIES
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
): Promise<TrackingResult> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const existingEvent =
          await tx.adEvent.findUnique({
            where: {
              eventId:
                event.eventId,
            },
          });

        if (existingEvent) {
          return {
            ok: true,
            event: existingEvent,
            deduped: true,
          };
        }

        const campaign =
          await tx.campaign.findUnique({
            where: {
              id: event.campaignId,
            },
          });

        if (!campaign) {
          return {
            ok: false,
            reason:
              "CAMPAIGN_NOT_FOUND",
          };
        }

        const impression =
          await tx.adEvent.findFirst({
            where: {
              campaignId:
                event.campaignId,

              userId:
                event.userId,

              eventType:
                "impression",
            },

            orderBy: {
              createdAt: "desc",
            },
          });

        if (!impression) {
          return {
            ok: false,
            reason:
              "NO_PRIOR_IMPRESSION",
          };
        }

        const newEvent =
          await tx.adEvent.create({
            data: {
              eventId:
                event.eventId,

              campaignId:
                event.campaignId,

              userId:
                event.userId,

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

        return {
          ok: true,
          event: newEvent,
          deduped: false,
        };
      }
    );
  } catch (error) {
    if (
      error instanceof
        Prisma
          .PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existingEvent =
        await prisma.adEvent.findUnique({
          where: {
            eventId:
              event.eventId,
          },
        });

      if (existingEvent) {
        return {
          ok: true,
          event: existingEvent,
          deduped: true,
        };
      }
    }

    throw error;
  }
}
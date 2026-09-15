import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import type { AdEvent } from "../generated/prisma/client.js";
import type { AdTokenPayload } from "./ad-token.service.js";
import { AD_CONFIG } from "../config/ad.config.js";

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

function getDayStart(): Date {
  const now = new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )
  );
}

function impressionEventId(jti: string): string {
  return `impression:${jti}`;
}

function clickEventId(jti: string): string {
  return `click:${jti}`;
}

async function lockCampaign(
  tx: Prisma.TransactionClient,
  campaignId: number
): Promise<boolean> {
  const rows = await tx.$queryRaw<Array<{ id: number }>>`
    SELECT "id"
    FROM "Campaign"
    WHERE "id" = ${campaignId}
    FOR UPDATE
  `;

  return rows.length > 0;
}

async function findDuplicateEvent(eventId: string) {
  return prisma.adEvent.findUnique({
    where: { eventId },
  });
}

export async function recordImpression(
  token: AdTokenPayload
): Promise<TrackingResult> {
  const eventId = impressionEventId(token.jti);

  const chargeMicros =
    token.bidType === "CPI"
      ? BigInt(token.bidPriceMicros)
      : 0n;

  try {
    return await prisma.$transaction(async (tx) => {
      const campaignExists =
        await lockCampaign(
          tx,
          token.campaignId
        );

      if (!campaignExists) {
        return {
          ok: false,
          reason:
            "CAMPAIGN_NOT_FOUND",
        };
      }

      const existingEvent =
        await tx.adEvent.findUnique({
          where: { eventId },
        });

      if (existingEvent) {
        return {
          ok: true,
          event: existingEvent,
          deduped: true,
        };
      }

      const campaign =
        await tx.campaign
          .findUniqueOrThrow({
            where: {
              id: token.campaignId,
            },
          });

      if (!campaign.isActive) {
        return {
          ok: false,
          reason: "CAMPAIGN_PAUSED",
        };
      }

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
              token.campaignId,
            userId: token.userId,
            eventType: "impression",
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

      if (chargeMicros > 0n) {
        if (
          campaign.spentMicros +
            chargeMicros >
          campaign.totalBudgetMicros
        ) {
          return {
            ok: false,
            reason:
              "TOTAL_BUDGET_EXHAUSTED",
          };
        }

        const dailySpendResult =
          await tx.adEvent.aggregate({
            where: {
              campaignId:
                token.campaignId,
              createdAt: {
                gte: getDayStart(),
              },
            },
            _sum: {
              costMicros: true,
            },
          });

        const dailySpend =
          dailySpendResult._sum
            .costMicros ?? 0n;

        if (
          dailySpend +
            chargeMicros >
          campaign.dailyBudgetMicros
        ) {
          return {
            ok: false,
            reason:
              "DAILY_BUDGET_EXHAUSTED",
          };
        }
      }

      const newEvent =
        await tx.adEvent.create({
          data: {
            eventId,
            campaignId:
              token.campaignId,
            userId: token.userId,
            eventType: "impression",
            costMicros: chargeMicros,
          },
        });

      await tx.campaign.update({
        where: {
          id: token.campaignId,
        },
        data: {
          impressions: {
            increment: 1,
          },
          ...(chargeMicros > 0n
            ? {
                spentMicros: {
                  increment:
                    chargeMicros,
                },
              }
            : {}),
        },
      });

      return {
        ok: true,
        event: newEvent,
        deduped: false,
      };
    });
  } catch (error) {
    if (
      error instanceof
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existingEvent =
        await findDuplicateEvent(
          eventId
        );

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

export async function recordClick(
  token: AdTokenPayload
): Promise<TrackingResult> {
  const eventId =
    clickEventId(token.jti);

  const requiredImpressionId =
    impressionEventId(token.jti);

  const chargeMicros =
    token.bidType === "CPC"
      ? BigInt(token.bidPriceMicros)
      : 0n;

  try {
    return await prisma.$transaction(
      async (tx) => {
        const campaignExists =
          await lockCampaign(
            tx,
            token.campaignId
          );

        if (!campaignExists) {
          return {
            ok: false,
            reason:
              "CAMPAIGN_NOT_FOUND",
          };
        }

        const existingEvent =
          await tx.adEvent.findUnique({
            where: { eventId },
          });

        if (existingEvent) {
          return {
            ok: true,
            event: existingEvent,
            deduped: true,
          };
        }

        const campaign =
          await tx.campaign
            .findUniqueOrThrow({
              where: {
                id:
                  token.campaignId,
              },
            });

        const impression =
          await tx.adEvent
            .findUnique({
              where: {
                eventId:
                  requiredImpressionId,
              },
            });

        if (
          !impression ||
          impression.campaignId !==
            token.campaignId ||
          impression.userId !==
            token.userId ||
          impression.eventType !==
            "impression"
        ) {
          return {
            ok: false,
            reason:
              "NO_PRIOR_IMPRESSION",
          };
        }

        if (chargeMicros > 0n) {
          if (
            campaign.spentMicros +
              chargeMicros >
            campaign.totalBudgetMicros
          ) {
            return {
              ok: false,
              reason:
                "TOTAL_BUDGET_EXHAUSTED",
            };
          }

          const dailySpendResult =
            await tx.adEvent
              .aggregate({
                where: {
                  campaignId:
                    token.campaignId,
                  createdAt: {
                    gte:
                      getDayStart(),
                  },
                },
                _sum: {
                  costMicros:
                    true,
                },
              });

          const dailySpend =
            dailySpendResult._sum
              .costMicros ?? 0n;

          if (
            dailySpend +
              chargeMicros >
            campaign.dailyBudgetMicros
          ) {
            return {
              ok: false,
              reason:
                "DAILY_BUDGET_EXHAUSTED",
            };
          }
        }

        const newEvent =
          await tx.adEvent.create({
            data: {
              eventId,
              campaignId:
                token.campaignId,
              userId:
                token.userId,
              eventType: "click",
              costMicros:
                chargeMicros,
            },
          });

        await tx.campaign.update({
          where: {
            id: token.campaignId,
          },
          data: {
            clicks: {
              increment: 1,
            },
            ...(chargeMicros > 0n
              ? {
                  spentMicros: {
                    increment:
                      chargeMicros,
                  },
                }
              : {}),
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
        Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existingEvent =
        await findDuplicateEvent(
          eventId
        );

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
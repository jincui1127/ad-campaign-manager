import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { prisma } from "../src/lib/prisma.js";
import { dollarsToMicros } from "../src/lib/money.js";
import {
  issueAdToken,
  verifyAdToken,
} from "../src/services/ad-token.service.js";
import type {
  AdTokenPayload,
} from "../src/services/ad-token.service.js";
import {
  recordClick,
  recordImpression,
} from "../src/services/tracking.service.js";
import {
  selectAd,
} from "../src/services/ad-serving.service.js";

process.env.AD_TOKEN_SECRET ??=
  "test-token-secret-that-is-longer-than-32-characters";

async function createCampaign(
  overrides: Partial<{
    name: string;
    headline: string;
    imageUrl: string;
    landingPageUrl: string;
    totalBudgetMicros: bigint;
    dailyBudgetMicros: bigint;
    bidPriceMicros: bigint;
    bidType: "CPI" | "CPC";
    country: string;
    device: string;
    category: string | null;
    isActive: boolean;
  }> = {}
) {
  return prisma.campaign.create({
    data: {
      name: "Test Campaign",
      headline: "Test Headline",
      imageUrl:
        "https://placehold.co/600x300?text=Test",
      landingPageUrl:
        "https://example.com/test",
      totalBudgetMicros:
        dollarsToMicros(100),
      dailyBudgetMicros:
        dollarsToMicros(100),
      bidPriceMicros:
        dollarsToMicros(1),
      bidType: "CPI",
      country: "AU",
      device: "mobile",
      category: "sports",
      isActive: true,
      ...overrides,
    },
  });
}

function createTrackingPayload(
  campaign: Awaited<
    ReturnType<typeof createCampaign>
  >,
  userId: string,
  jti: string
): AdTokenPayload {
  return {
    jti,
    campaignId: campaign.id,
    userId,
    bidType: campaign.bidType,
    bidPriceMicros:
      campaign.bidPriceMicros.toString(),
    exp:
      Math.floor(Date.now() / 1000) +
      900,
  };
}

describe(
  "core ad delivery behaviour",
  () => {
    beforeEach(async () => {
      await prisma.adEvent.deleteMany();
      await prisma.campaign.deleteMany();
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    it(
      "returns null when no campaign matches",
      async () => {
        await createCampaign();

        const ad =
          await selectAd({
            userId: "no-match-user",
            country: "JP",
            device: "tablet",
            category: "finance",
          });

        expect(ad).toBeNull();
      }
    );

    it(
      "does not double-count the same impression opportunity",
      async () => {
        const campaign =
          await createCampaign();

        const payload =
          createTrackingPayload(
            campaign,
            "duplicate-user",
            "duplicate-opportunity"
          );

        const first =
          await recordImpression(
            payload
          );

        const second =
          await recordImpression(
            payload
          );

        expect(first.ok).toBe(true);
        expect(second.ok).toBe(true);

        if (
          first.ok &&
          second.ok
        ) {
          expect(first.deduped)
            .toBe(false);
          expect(second.deduped)
            .toBe(true);
        }

        const eventCount =
          await prisma.adEvent.count({
            where: {
              eventId:
                "impression:duplicate-opportunity",
            },
          });

        const updatedCampaign =
          await prisma.campaign
            .findUniqueOrThrow({
              where: {
                id:
                  campaign.id,
              },
            });

        expect(eventCount)
          .toBe(1);

        expect(
          updatedCampaign
            .impressions
        ).toBe(1);

        expect(
          updatedCampaign
            .spentMicros
        ).toBe(
          dollarsToMicros(1)
        );
      }
    );

    it(
      "stops serving a campaign after the frequency cap",
      async () => {
        const campaign =
          await createCampaign();

        const userId =
          "frequency-user";

        for (
          let i = 1;
          i <= 3;
          i++
        ) {
          const result =
            await recordImpression(
              createTrackingPayload(
                campaign,
                userId,
                `frequency-${i}`
              )
            );

          expect(result.ok)
            .toBe(true);
        }

        const blocked =
          await recordImpression(
            createTrackingPayload(
              campaign,
              userId,
              "frequency-4"
            )
          );

        expect(blocked)
          .toEqual({
            ok: false,
            reason:
              "FREQUENCY_CAP_REACHED",
          });

        const ad =
          await selectAd({
            userId,
            country: "AU",
            device: "mobile",
            category: "sports",
          });

        expect(ad).toBeNull();
      }
    );

    it(
      "never exceeds the total budget under concurrent impressions",
      async () => {
        const campaign =
          await createCampaign({
            totalBudgetMicros:
              dollarsToMicros(3),
            bidPriceMicros:
              dollarsToMicros(1),
          });

        const requests =
          Array.from(
            { length: 10 },
            (_, index) =>
              recordImpression(
                createTrackingPayload(
                  campaign,
                  `concurrent-user-${index}`,
                  `concurrent-${index}`
                )
              )
          );

        await Promise.allSettled(
          requests
        );

        const updatedCampaign =
          await prisma.campaign
            .findUniqueOrThrow({
              where: {
                id:
                  campaign.id,
              },
            });

        expect(
          updatedCampaign
            .spentMicros
        ).toBeLessThanOrEqual(
          updatedCampaign
            .totalBudgetMicros
        );

        expect(
          updatedCampaign
            .impressions
        ).toBeLessThanOrEqual(3);
      }
    );

    it(
      "matches an unrestricted category campaign when the request has a category",
      async () => {
        const campaign =
          await createCampaign({
            category: null,
          });

        const ad =
          await selectAd({
            userId:
              "category-user-1",
            country: "AU",
            device: "mobile",
            category: "sports",
          });

        expect(ad?.id)
          .toBe(campaign.id);
      }
    );

    it(
      "does not match a category-targeted campaign when the request has no category",
      async () => {
        await createCampaign({
          category: "sports",
        });

        const ad =
          await selectAd({
            userId:
              "category-user-2",
            country: "AU",
            device: "mobile",
          });

        expect(ad).toBeNull();
      }
    );

    it(
      "matches an unrestricted campaign when the request has no category",
      async () => {
        const campaign =
          await createCampaign({
            category: null,
          });

        const ad =
          await selectAd({
            userId:
              "category-user-3",
            country: "AU",
            device: "mobile",
          });

        expect(ad?.id)
          .toBe(campaign.id);
      }
    );

    it(
      "charges CPI on impression but not click",
      async () => {
        const campaign =
          await createCampaign({
            bidType: "CPI",
            bidPriceMicros:
              dollarsToMicros(0.8),
          });

        const payload =
          createTrackingPayload(
            campaign,
            "cpi-user",
            "cpi-opportunity"
          );

        await recordImpression(
          payload
        );

        const afterImpression =
          await prisma.campaign
            .findUniqueOrThrow({
              where: {
                id:
                  campaign.id,
              },
            });

        expect(
          afterImpression
            .spentMicros
        ).toBe(
          dollarsToMicros(0.8)
        );

        await recordClick(payload);

        const afterClick =
          await prisma.campaign
            .findUniqueOrThrow({
              where: {
                id:
                  campaign.id,
              },
            });

        expect(
          afterClick.spentMicros
        ).toBe(
          dollarsToMicros(0.8)
        );
      }
    );

    it(
      "charges CPC on click but not impression",
      async () => {
        const campaign =
          await createCampaign({
            bidType: "CPC",
            bidPriceMicros:
              dollarsToMicros(0.6),
          });

        const payload =
          createTrackingPayload(
            campaign,
            "cpc-user",
            "cpc-opportunity"
          );

        await recordImpression(
          payload
        );

        const afterImpression =
          await prisma.campaign
            .findUniqueOrThrow({
              where: {
                id:
                  campaign.id,
              },
            });

        expect(
          afterImpression
            .spentMicros
        ).toBe(0n);

        const firstClick =
          await recordClick(payload);

        const secondClick =
          await recordClick(payload);

        expect(firstClick.ok)
          .toBe(true);

        expect(secondClick.ok)
          .toBe(true);

        if (
          firstClick.ok &&
          secondClick.ok
        ) {
          expect(
            secondClick.deduped
          ).toBe(true);
        }

        const afterClick =
          await prisma.campaign
            .findUniqueOrThrow({
              where: {
                id:
                  campaign.id,
              },
            });

        expect(
          afterClick.spentMicros
        ).toBe(
          dollarsToMicros(0.6)
        );

        expect(
          afterClick.clicks
        ).toBe(1);
      }
    );

    it(
      "requires a click to reference its exact impression opportunity",
      async () => {
        const campaign =
          await createCampaign({
            bidType: "CPC",
          });

        const impressionPayload =
          createTrackingPayload(
            campaign,
            "attribution-user",
            "opportunity-a"
          );

        const otherPayload =
          createTrackingPayload(
            campaign,
            "attribution-user",
            "opportunity-b"
          );

        await recordImpression(
          impressionPayload
        );

        const click =
          await recordClick(
            otherPayload
          );

        expect(click).toEqual({
          ok: false,
          reason:
            "NO_PRIOR_IMPRESSION",
        });
      }
    );

    it(
      "issues and verifies a token that binds campaign user and bid terms",
      async () => {
        const token = issueAdToken({
          campaignId: 123,
          userId: "token-user",
          bidType: "CPC",
          bidPriceMicros:
            dollarsToMicros(0.75),
        });

        const result =
          verifyAdToken(token);

        expect(result.ok)
          .toBe(true);

        if (result.ok) {
          expect(
            result.payload
              .campaignId
          ).toBe(123);

          expect(
            result.payload.userId
          ).toBe("token-user");

          expect(
            result.payload.bidType
          ).toBe("CPC");

          expect(
            result.payload
              .bidPriceMicros
          ).toBe(
            dollarsToMicros(
              0.75
            ).toString()
          );
        }
      }
    );

    it(
      "rejects a tampered signed token",
      async () => {
        const token = issueAdToken({
          campaignId: 1,
          userId: "token-user",
          bidType: "CPI",
          bidPriceMicros:
            dollarsToMicros(1),
        });

        const [payload, signature] =
          token.split(".");

        const tamperedToken =
          `${payload}x.${signature}`;

        expect(
          verifyAdToken(
            tamperedToken
          )
        ).toEqual({
          ok: false,
          reason:
            "INVALID_AD_TOKEN",
        });
      }
    );

    it(
      "rejects an expired signed token",
      async () => {
        const token = issueAdToken(
          {
            campaignId: 1,
            userId: "token-user",
            bidType: "CPI",
            bidPriceMicros:
              dollarsToMicros(1),
          },
          -1
        );

        expect(
          verifyAdToken(token)
        ).toEqual({
          ok: false,
          reason:
            "EXPIRED_AD_TOKEN",
        });
      }
    );
  }
);
import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import {
  prisma,
} from "../src/lib/prisma.js";

import {
  recordImpression,
} from "../src/services/tracking.service.js";

import {
  selectAd,
} from "../src/services/ad-serving.service.js";


async function createCampaign(
  overrides: Partial<{
    name: string;
    headline: string;
    imageUrl: string;
    landingPageUrl: string;
    totalBudget: number;
    dailyBudget: number;
    bidPrice: number;
    country: string;
    device: string;
    category: string | null;
    isActive: boolean;
  }> = {}
) {
  return prisma.campaign.create({
    data: {
      name:
        "Test Campaign",

      headline:
        "Test Headline",

      imageUrl:
        "https://placehold.co/600x300?text=Test",

      landingPageUrl:
        "https://example.com/test",

      totalBudget: 100,
      dailyBudget: 100,
      bidPrice: 1,

      country: "AU",
      device: "mobile",
      category: "sports",

      isActive: true,

      ...overrides,
    },
  });
}


describe(
  "core ad delivery behaviour",
  () => {
    beforeEach(async () => {
      await prisma.adEvent
        .deleteMany();

      await prisma.campaign
        .deleteMany();
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
            userId:
              "user-no-match",

            country: "JP",
            device: "tablet",
            category: "finance",
          });

        expect(ad).toBeNull();
      }
    );


    it(
      "does not double-count the same eventId",
      async () => {
        const campaign =
          await createCampaign();

        const event = {
          eventId:
            "duplicate-event-1",

          campaignId:
            campaign.id,

          userId:
            "duplicate-user",
        };

        const first =
          await recordImpression(
            event
          );

        const second =
          await recordImpression(
            event
          );

        expect(first.ok)
          .toBe(true);

        expect(second.ok)
          .toBe(true);

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
                event.eventId,
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
          updatedCampaign.spent
        ).toBe(1);
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
            await recordImpression({
              eventId:
                `frequency-event-${i}`,

              campaignId:
                campaign.id,

              userId,
            });

          expect(result.ok)
            .toBe(true);
        }

        const blocked =
          await recordImpression({
            eventId:
              "frequency-event-4",

            campaignId:
              campaign.id,

            userId,
          });

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

        const impressions =
          await prisma.adEvent
            .count({
              where: {
                campaignId:
                  campaign.id,

                userId,

                eventType:
                  "impression",
              },
            });

        expect(impressions)
          .toBe(3);
      }
    );


    it(
      "never exceeds the total budget under concurrent impressions",
      async () => {
        const campaign =
          await createCampaign({
            totalBudget: 3,
            dailyBudget: 100,
            bidPrice: 1,
          });

        const requests =
          Array.from(
            {
              length: 10,
            },

            (_, index) =>
              recordImpression({
                eventId:
                  `concurrent-event-${index}`,

                campaignId:
                  campaign.id,

                userId:
                  `concurrent-user-${index}`,
              })
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

        const impressionCount =
          await prisma.adEvent
            .count({
              where: {
                campaignId:
                  campaign.id,

                eventType:
                  "impression",
              },
            });

        expect(
          updatedCampaign.spent
        ).toBeLessThanOrEqual(
          updatedCampaign
            .totalBudget
        );

        expect(
          updatedCampaign
            .impressions
        ).toBeLessThanOrEqual(3);

        expect(
          impressionCount
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
  }
);
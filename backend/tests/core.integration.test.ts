import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { prisma } from "../src/lib/prisma.js";
import { dollarsToMicros } from "../src/lib/money.js";
import { recordClick, recordImpression } from "../src/services/tracking.service.js";
import { selectAd } from "../src/services/ad-serving.service.js";

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
      imageUrl: "https://placehold.co/600x300?text=Test",
      landingPageUrl: "https://example.com/test",
      totalBudgetMicros: dollarsToMicros(100),
      dailyBudgetMicros: dollarsToMicros(100),
      bidPriceMicros: dollarsToMicros(1),
      bidType: "CPI",
      country: "AU",
      device: "mobile",
      category: "sports",
      isActive: true,
      ...overrides,
    },
  });
}

describe("core ad delivery behaviour", () => {
  beforeEach(async () => {
    await prisma.adEvent.deleteMany();
    await prisma.campaign.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("returns null when no campaign matches", async () => {
    await createCampaign();

    const ad = await selectAd({
      userId: "user-no-match",
      country: "JP",
      device: "tablet",
      category: "finance",
    });

    expect(ad).toBeNull();
  });

  it("does not double-count the same eventId", async () => {
    const campaign = await createCampaign();

    const event = {
      eventId: "duplicate-event-1",
      campaignId: campaign.id,
      userId: "duplicate-user",
    };

    const first = await recordImpression(event);
    const second = await recordImpression(event);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);

    if (first.ok && second.ok) {
      expect(first.deduped).toBe(false);
      expect(second.deduped).toBe(true);
    }

    const eventCount = await prisma.adEvent.count({
      where: { eventId: event.eventId },
    });

    const updatedCampaign =
      await prisma.campaign.findUniqueOrThrow({
        where: { id: campaign.id },
      });

    expect(eventCount).toBe(1);
    expect(updatedCampaign.impressions).toBe(1);
    expect(updatedCampaign.spentMicros).toBe(
      dollarsToMicros(1)
    );
  });

  it("stops serving a campaign after the frequency cap", async () => {
    const campaign = await createCampaign();
    const userId = "frequency-user";

    for (let i = 1; i <= 3; i++) {
      const result = await recordImpression({
        eventId: `frequency-event-${i}`,
        campaignId: campaign.id,
        userId,
      });

      expect(result.ok).toBe(true);
    }

    const blocked = await recordImpression({
      eventId: "frequency-event-4",
      campaignId: campaign.id,
      userId,
    });

    expect(blocked).toEqual({
      ok: false,
      reason: "FREQUENCY_CAP_REACHED",
    });

    const ad = await selectAd({
      userId,
      country: "AU",
      device: "mobile",
      category: "sports",
    });

    expect(ad).toBeNull();

    const impressions = await prisma.adEvent.count({
      where: {
        campaignId: campaign.id,
        userId,
        eventType: "impression",
      },
    });

    expect(impressions).toBe(3);
  });

  it("never exceeds the total budget under concurrent impressions", async () => {
    const campaign = await createCampaign({
      totalBudgetMicros: dollarsToMicros(3),
      dailyBudgetMicros: dollarsToMicros(100),
      bidPriceMicros: dollarsToMicros(1),
      bidType: "CPI",
    });

    const requests = Array.from(
      { length: 10 },
      (_, index) =>
        recordImpression({
          eventId: `concurrent-event-${index}`,
          campaignId: campaign.id,
          userId: `concurrent-user-${index}`,
        })
    );

    await Promise.allSettled(requests);

    const updatedCampaign =
      await prisma.campaign.findUniqueOrThrow({
        where: { id: campaign.id },
      });

    const impressionCount = await prisma.adEvent.count({
      where: {
        campaignId: campaign.id,
        eventType: "impression",
      },
    });

    expect(updatedCampaign.spentMicros).toBeLessThanOrEqual(
      updatedCampaign.totalBudgetMicros
    );

    expect(updatedCampaign.impressions).toBeLessThanOrEqual(3);
    expect(impressionCount).toBeLessThanOrEqual(3);
  });

  it("matches an unrestricted category campaign when the request has a category", async () => {
    const campaign = await createCampaign({
      category: null,
    });

    const ad = await selectAd({
      userId: "category-user-1",
      country: "AU",
      device: "mobile",
      category: "sports",
    });

    expect(ad?.id).toBe(campaign.id);
  });

  it("does not match a category-targeted campaign when the request has no category", async () => {
    await createCampaign({
      category: "sports",
    });

    const ad = await selectAd({
      userId: "category-user-2",
      country: "AU",
      device: "mobile",
    });

    expect(ad).toBeNull();
  });

  it("matches an unrestricted campaign when the request has no category", async () => {
    const campaign = await createCampaign({
      category: null,
    });

    const ad = await selectAd({
      userId: "category-user-3",
      country: "AU",
      device: "mobile",
    });

    expect(ad?.id).toBe(campaign.id);
  });

  it("charges a CPI campaign on impression but not on click", async () => {
    const campaign = await createCampaign({
      bidType: "CPI",
      bidPriceMicros: dollarsToMicros(0.8),
    });

    const impression = await recordImpression({
      eventId: "cpi-impression",
      campaignId: campaign.id,
      userId: "cpi-user",
    });

    expect(impression.ok).toBe(true);

    const afterImpression =
      await prisma.campaign.findUniqueOrThrow({
        where: { id: campaign.id },
      });

    expect(afterImpression.spentMicros).toBe(
      dollarsToMicros(0.8)
    );
    expect(afterImpression.impressions).toBe(1);

    const click = await recordClick({
      eventId: "cpi-click",
      campaignId: campaign.id,
      userId: "cpi-user",
    });

    expect(click.ok).toBe(true);

    const afterClick =
      await prisma.campaign.findUniqueOrThrow({
        where: { id: campaign.id },
      });

    expect(afterClick.spentMicros).toBe(
      dollarsToMicros(0.8)
    );
    expect(afterClick.clicks).toBe(1);
  });

  it("charges a CPC campaign on click but not on impression", async () => {
    const campaign = await createCampaign({
      bidType: "CPC",
      bidPriceMicros: dollarsToMicros(0.6),
    });

    const impression = await recordImpression({
      eventId: "cpc-impression",
      campaignId: campaign.id,
      userId: "cpc-user",
    });

    expect(impression.ok).toBe(true);

    const afterImpression =
      await prisma.campaign.findUniqueOrThrow({
        where: { id: campaign.id },
      });

    expect(afterImpression.spentMicros).toBe(0n);
    expect(afterImpression.impressions).toBe(1);

    const click = await recordClick({
      eventId: "cpc-click",
      campaignId: campaign.id,
      userId: "cpc-user",
    });

    expect(click.ok).toBe(true);

    const afterClick =
      await prisma.campaign.findUniqueOrThrow({
        where: { id: campaign.id },
      });

    expect(afterClick.spentMicros).toBe(
      dollarsToMicros(0.6)
    );
    expect(afterClick.clicks).toBe(1);

    const clickEvent =
      await prisma.adEvent.findUniqueOrThrow({
        where: { eventId: "cpc-click" },
      });

    expect(clickEvent.costMicros).toBe(
      dollarsToMicros(0.6)
    );
  });
});
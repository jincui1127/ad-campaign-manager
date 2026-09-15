import { prisma } from "../lib/prisma.js";
import { dollarsToMicros, microsToDollars } from "../lib/money.js";
import type { Campaign, Prisma } from "../generated/prisma/client.js";
import type {
  CampaignCreateInput,
  CampaignUpdateInput,
} from "../schemas/campaign.schema.js";

export function toCampaignResponse(campaign: Campaign) {
  return {
    id: campaign.id,
    name: campaign.name,
    headline: campaign.headline,
    imageUrl: campaign.imageUrl,
    landingPageUrl: campaign.landingPageUrl,
    totalBudget: microsToDollars(campaign.totalBudgetMicros),
    dailyBudget: microsToDollars(campaign.dailyBudgetMicros),
    bidPrice: microsToDollars(campaign.bidPriceMicros),
    bidType: campaign.bidType,
    countries: campaign.countries,
    devices: campaign.devices,
    categories: campaign.categories,
    isActive: campaign.isActive,
    spent: microsToDollars(campaign.spentMicros),
    impressions: campaign.impressions,
    clicks: campaign.clicks,
    createdAt: campaign.createdAt,
  };
}

export async function createCampaign(data: CampaignCreateInput) {
  const createData: Prisma.CampaignCreateInput = {
    name: data.name,
    headline: data.headline,
    imageUrl: data.imageUrl,
    landingPageUrl: data.landingPageUrl,
    totalBudgetMicros: dollarsToMicros(data.totalBudget),
    dailyBudgetMicros: dollarsToMicros(data.dailyBudget),
    bidPriceMicros: dollarsToMicros(data.bidPrice),
    bidType: data.bidType,
    countries: data.countries,
    devices: data.devices,
    categories: data.categories,
  };

  const campaign = await prisma.campaign.create({
    data: createData,
  });

  return toCampaignResponse(campaign);
}

export async function getCampaigns() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { id: "asc" },
  });

  return campaigns.map(toCampaignResponse);
}

export async function getCampaignById(campaignId: number) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });

  return campaign ? toCampaignResponse(campaign) : null;
}

export async function updateCampaign(
  id: number,
  data: CampaignUpdateInput
) {
  const updateData: Prisma.CampaignUpdateInput = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.headline !== undefined) updateData.headline = data.headline;
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;

  if (data.landingPageUrl !== undefined) {
    updateData.landingPageUrl = data.landingPageUrl;
  }

  if (data.totalBudget !== undefined) {
    updateData.totalBudgetMicros = dollarsToMicros(data.totalBudget);
  }

  if (data.dailyBudget !== undefined) {
    updateData.dailyBudgetMicros = dollarsToMicros(data.dailyBudget);
  }

  if (data.bidPrice !== undefined) {
    updateData.bidPriceMicros = dollarsToMicros(data.bidPrice);
  }

  if (data.bidType !== undefined) updateData.bidType = data.bidType;
  if (data.countries !== undefined) updateData.countries = data.countries;
  if (data.devices !== undefined) updateData.devices = data.devices;
  if (data.categories !== undefined) updateData.categories = data.categories;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const campaign = await prisma.campaign.update({
    where: { id },
    data: updateData,
  });

  return toCampaignResponse(campaign);
}
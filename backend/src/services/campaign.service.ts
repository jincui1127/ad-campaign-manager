import { prisma } from "../lib/prisma.js";
import type { Prisma } from "../generated/prisma/client.js";

import type {
  CampaignCreateInput,
  CampaignUpdateInput,
} from "../schemas/campaign.schema.js";


export async function createCampaign(
  data: CampaignCreateInput
) {
  const createData: Prisma.CampaignCreateInput = {
    name: data.name,
    headline: data.headline,
    imageUrl: data.imageUrl,
    landingPageUrl: data.landingPageUrl,
    totalBudget: data.totalBudget,
    dailyBudget: data.dailyBudget,
    bidPrice: data.bidPrice,
    country: data.country,
    device: data.device,

    ...(data.category !== undefined
      ? { category: data.category }
      : {}),
  };

  return prisma.campaign.create({
    data: createData,
  });
}


export async function getCampaigns() {
  return prisma.campaign.findMany({
    orderBy: {
      id: "asc",
    },
  });
}


export async function getCampaignById(
  campaignId: number
) {
  return prisma.campaign.findUnique({
    where: {
      id: campaignId,
    },
  });
}


export async function updateCampaign(
  id: number,
  data: CampaignUpdateInput
) {
  const updateData: Prisma.CampaignUpdateInput = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
  }

  if (data.headline !== undefined) {
    updateData.headline = data.headline;
  }

  if (data.imageUrl !== undefined) {
    updateData.imageUrl = data.imageUrl;
  }

  if (data.landingPageUrl !== undefined) {
    updateData.landingPageUrl =
      data.landingPageUrl;
  }

  if (data.totalBudget !== undefined) {
    updateData.totalBudget = data.totalBudget;
  }

  if (data.dailyBudget !== undefined) {
    updateData.dailyBudget = data.dailyBudget;
  }

  if (data.bidPrice !== undefined) {
    updateData.bidPrice = data.bidPrice;
  }

  if (data.country !== undefined) {
    updateData.country = data.country;
  }

  if (data.device !== undefined) {
    updateData.device = data.device;
  }

  if (data.category !== undefined) {
    updateData.category = data.category;
  }

  if (data.isActive !== undefined) {
    updateData.isActive = data.isActive;
  }

  return prisma.campaign.update({
    where: {
      id,
    },
    data: updateData,
  });
}
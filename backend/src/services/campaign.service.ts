import { prisma } from "../lib/prisma";


export async function createCampaign(data: {
  name: string;
  headline: string;
  imageUrl: string;
  landingPageUrl: string;

  totalBudget: number;
  dailyBudget: number;
  bidPrice: number;

  country: string;
  device: string;
  category?: string | null;
}) {
  return prisma.campaign.create({
    data,
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
  campaignId: number,
  data: {
    name?: string;
    headline?: string;
    imageUrl?: string;
    landingPageUrl?: string;

    totalBudget?: number;
    dailyBudget?: number;
    bidPrice?: number;

    country?: string;
    device?: string;
    category?: string | null;

    isActive?: boolean;
  }
) {
  return prisma.campaign.update({
    where: {
      id: campaignId,
    },
    data,
  });
}
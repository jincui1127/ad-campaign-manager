export interface Campaign {
  id: number;
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
  spent: number;
  impressions: number;
  clicks: number;
  createdAt: string;
}

export interface CampaignInput {
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
}

export interface AdRequest {
  userId: string;
  country: string;
  device: string;
  category?: string;
}

export interface ServedAd {
  campaignId: number;
  headline: string;
  imageUrl: string;
  landingPageUrl: string;
  bidPrice: number;
}
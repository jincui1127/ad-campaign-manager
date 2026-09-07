import type {
  AdRequest,
  Campaign,
  CampaignInput,
  ServedAd,
} from "../types";

const API_BASE = "/api";


export async function getCampaigns(): Promise<Campaign[]> {
  const response = await fetch(`${API_BASE}/campaigns`);

  if (!response.ok) {
    throw new Error("Failed to load campaigns");
  }

  return response.json();
}


export async function createCampaign(
  data: CampaignInput
): Promise<Campaign> {
  const response = await fetch(`${API_BASE}/campaigns`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create campaign");
  }

  return response.json();
}


export async function updateCampaign(
  id: number,
  data: Partial<CampaignInput> & {
    isActive?: boolean;
  }
): Promise<Campaign> {
  const response = await fetch(
    `${API_BASE}/campaigns/${id}`,
    {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to update campaign");
  }

  return response.json();
}


export async function serveAd(
  data: AdRequest
): Promise<ServedAd | null> {
  const response = await fetch(`${API_BASE}/ads/serve`, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to request ad");
  }

  const result = await response.json();

  if (result.ad === null) {
    return null;
  }

  return result;
}


export async function recordImpression(
  campaignId: number,
  userId: string
) {
  const response = await fetch(
    `${API_BASE}/events/impression`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        eventId: crypto.randomUUID(),
        campaignId,
        userId,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Unable to record impression");
  }

  return response.json();
}


export async function recordClick(
  campaignId: number,
  userId: string
) {
  const response = await fetch(
    `${API_BASE}/events/click`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        eventId: crypto.randomUUID(),
        campaignId,
        userId,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Unable to record click");
  }

  return response.json();
}
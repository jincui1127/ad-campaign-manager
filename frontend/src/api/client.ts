import type {
  AdRequest,
  Campaign,
  CampaignInput,
  ServedAd,
} from "../types";

const API_BASE = "/api";

async function getApiErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const body = await response.json();

    if (
      body &&
      typeof body.error === "string"
    ) {
      return body.error;
    }
  } catch {
    // Use fallback for non-JSON responses.
  }

  return fallback;
}

export async function getCampaigns(): Promise<Campaign[]> {
  const response = await fetch(`${API_BASE}/campaigns`);

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        "Failed to load campaigns"
      )
    );
  }

  return response.json();
}

export async function getCampaignById(
  id: number
): Promise<Campaign> {
  const response = await fetch(
    `${API_BASE}/campaigns/${id}`
  );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        "Failed to load campaign"
      )
    );
  }

  return response.json();
}

export async function createCampaign(
  data: CampaignInput
): Promise<Campaign> {
  const response = await fetch(
    `${API_BASE}/campaigns`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        "Failed to create campaign"
      )
    );
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
    throw new Error(
      await getApiErrorMessage(
        response,
        "Failed to update campaign"
      )
    );
  }

  return response.json();
}

export async function serveAd(
  data: AdRequest
): Promise<ServedAd | null> {
  const response = await fetch(
    `${API_BASE}/ads/serve`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        "Failed to request ad"
      )
    );
  }

  const result = await response.json();

  if (result.ad === null) {
    return null;
  }

  return result;
}

export async function recordImpression(
  token: string
) {
  const response = await fetch(
    `${API_BASE}/events/impression`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    }
  );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        "Unable to record impression"
      )
    );
  }

  return response.json();
}

export async function recordClick(
  token: string
) {
  const response = await fetch(
    `${API_BASE}/events/click`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    }
  );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        "Unable to record click"
      )
    );
  }

  return response.json();
}
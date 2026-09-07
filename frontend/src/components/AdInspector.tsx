import { useState } from "react";

import {
  getCampaignById,
  recordClick,
  recordImpression,
  serveAd,
} from "../api/client";

import type {
  AdRequest,
  Campaign,
  ServedAd,
} from "../types";


const initialRequest: AdRequest = {
  userId: "demo_user",
  country: "AU",
  device: "mobile",
  category: "sports",
};


export default function AdInspector() {
  const [request, setRequest] =
    useState<AdRequest>(initialRequest);

  const [servedAd, setServedAd] =
    useState<ServedAd | null>(null);

  const [campaign, setCampaign] =
    useState<Campaign | null>(null);

  const [impressionRecorded, setImpressionRecorded] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");


  function updateRequestField(
    field: keyof AdRequest,
    value: string
  ) {
    setRequest((current) => ({
      ...current,
      [field]: value,
    }));
  }


  async function refreshCampaign(
    campaignId: number
  ) {
    const latestCampaign =
      await getCampaignById(campaignId);

    setCampaign(latestCampaign);
  }


  async function handleRequestAd() {
    try {
      setLoading(true);
      setError("");
      setMessage("");
      setServedAd(null);
      setCampaign(null);
      setImpressionRecorded(false);

      const requestData: AdRequest = {
        userId: request.userId.trim(),
        country: request.country.trim(),
        device: request.device,
        ...(request.category?.trim()
          ? {
              category:
                request.category.trim(),
            }
          : {}),
      };

      const ad = await serveAd(requestData);

      if (!ad) {
        setMessage(
          "No eligible ad found for this visitor."
        );
        return;
      }

      setServedAd(ad);

      await refreshCampaign(ad.campaignId);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to request ad"
      );
    } finally {
      setLoading(false);
    }
  }


  async function handleImpression() {
    if (!servedAd) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      await recordImpression(
        servedAd.campaignId,
        request.userId.trim()
      );

      setImpressionRecorded(true);

      await refreshCampaign(
        servedAd.campaignId
      );

      setMessage(
        "Impression recorded successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to record impression"
      );
    } finally {
      setLoading(false);
    }
  }


  async function handleClick() {
    if (!servedAd) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      await recordClick(
        servedAd.campaignId,
        request.userId.trim()
      );

      await refreshCampaign(
        servedAd.campaignId
      );

      setMessage(
        "Click recorded successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to record click"
      );
    } finally {
      setLoading(false);
    }
  }


  return (
    <section className="inspector">
      <div className="inspector-header">
        <div>
          <h2>Ad Inspector</h2>

          <p>
            Simulate an ad request and verify
            delivery, budget and frequency
            behaviour.
          </p>
        </div>
      </div>


      <div className="inspector-layout">
        <div className="inspector-request">
          <h3>Visitor Context</h3>

          <label>
            User ID
            <input
              value={request.userId}
              onChange={(event) =>
                updateRequestField(
                  "userId",
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Country
            <input
              value={request.country}
              onChange={(event) =>
                updateRequestField(
                  "country",
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Device
            <select
              value={request.device}
              onChange={(event) =>
                updateRequestField(
                  "device",
                  event.target.value
                )
              }
            >
              <option value="mobile">
                mobile
              </option>

              <option value="desktop">
                desktop
              </option>

              <option value="tablet">
                tablet
              </option>
            </select>
          </label>

          <label>
            Category
            <input
              value={request.category ?? ""}
              onChange={(event) =>
                updateRequestField(
                  "category",
                  event.target.value
                )
              }
            />
          </label>

          <button
            type="button"
            onClick={handleRequestAd}
            disabled={
              loading ||
              !request.userId.trim() ||
              !request.country.trim()
            }
          >
            {loading
              ? "Loading..."
              : "Request Ad"}
          </button>
        </div>


        <div className="inspector-result">
          <h3>Winning Ad</h3>

          {!servedAd && !message && (
            <p className="secondary-text">
              Submit a visitor context to
              request an ad.
            </p>
          )}

          {servedAd && (
            <>
              <div className="ad-preview">
                <h3>
                  {servedAd.headline}
                </h3>

                <div className="ad-image-container">
                  <img
                    src={servedAd.imageUrl}
                    alt={servedAd.headline}
                    onError={(event) => {
                      event.currentTarget.style.display =
                        "none";
                    }}
                  />
                </div>

                <p>
                  <strong>Campaign ID:</strong>{" "}
                  {servedAd.campaignId}
                </p>

                <p>
                  <strong>Bid:</strong> $
                  {servedAd.bidPrice.toFixed(2)}
                </p>

                <a
                  href={servedAd.landingPageUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Landing Page
                </a>
              </div>


              <div className="inspector-actions">
                <button
                  type="button"
                  onClick={handleImpression}
                  disabled={loading}
                >
                  Simulate Impression
                </button>

                <button
                  type="button"
                  onClick={handleClick}
                  disabled={
                    loading ||
                    !impressionRecorded
                  }
                >
                  Simulate Click
                </button>
              </div>
            </>
          )}


          {message && (
            <p className="success-message">
              {message}
            </p>
          )}

          {error && (
            <p className="error-message">
              {error}
            </p>
          )}
        </div>
      </div>


      {campaign && (
        <div className="inspector-metrics">
          <h3>Live Campaign Metrics</h3>

          <div className="metrics-grid">
            <div>
              <span>Status</span>

              <strong>
                {campaign.isActive
                  ? "Active"
                  : "Paused"}
              </strong>
            </div>

            <div>
              <span>Spent</span>

              <strong>
                ${campaign.spent.toFixed(2)}
              </strong>
            </div>

            <div>
              <span>Total Budget</span>

              <strong>
                ${campaign.totalBudget.toFixed(2)}
              </strong>
            </div>

            <div>
              <span>Daily Budget</span>

              <strong>
                ${campaign.dailyBudget.toFixed(2)}
              </strong>
            </div>

            <div>
              <span>Impressions</span>

              <strong>
                {campaign.impressions}
              </strong>
            </div>

            <div>
              <span>Clicks</span>

              <strong>
                {campaign.clicks}
              </strong>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
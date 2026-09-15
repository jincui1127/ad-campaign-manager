import { useEffect, useState } from "react";
import { getCampaigns, updateCampaign } from "../api/client";
import type { Campaign } from "../types";
import CampaignForm from "./CampaignForm";

function displayTarget(values: string[], fallback: string) {
  return values.length > 0 ? values.join(", ") : fallback;
}

export default function CampaignDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] =
    useState<Campaign | null>(null);

  async function loadCampaigns() {
    try {
      setLoading(true);
      setError("");
      setCampaigns(await getCampaigns());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load campaigns"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function toggleCampaignStatus(campaign: Campaign) {
    try {
      setError("");

      const updatedCampaign = await updateCampaign(
        campaign.id,
        {
          isActive: !campaign.isActive,
        }
      );

      setCampaigns((current) =>
        current.map((item) =>
          item.id === updatedCampaign.id
            ? updatedCampaign
            : item
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update campaign"
      );
    }
  }

  function openCreateForm() {
    setEditingCampaign(null);
    setShowForm(true);
  }

  function openEditForm(campaign: Campaign) {
    setEditingCampaign(campaign);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingCampaign(null);
  }

  async function handleCampaignSaved() {
    closeForm();
    await loadCampaigns();
  }

  if (loading) {
    return <p>Loading campaigns...</p>;
  }

  return (
    <section className="dashboard">
      <div className="dashboard-header">
        <div>
          <h2>Campaign Dashboard</h2>
          <p>
            Monitor campaign delivery, budgets and performance.
          </p>
        </div>

        <div className="dashboard-actions">
          <button type="button" onClick={openCreateForm}>
            + Create Campaign
          </button>

          <button type="button" onClick={loadCampaigns}>
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="error-message">{error}</p>}

      {showForm && (
        <CampaignForm
          campaign={editingCampaign}
          onSaved={handleCampaignSaved}
          onCancel={closeForm}
        />
      )}

      <div className="table-wrapper">
        <table className="campaign-table">
          <thead>
            <tr>
              <th>Campaign</th>
              <th>Status</th>
              <th>Targeting</th>
              <th>Bid</th>
              <th>Budget</th>
              <th>Spent</th>
              <th>Impressions</th>
              <th>Clicks</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign.id}>
                <td>
                  <strong>{campaign.name}</strong>
                  <div className="secondary-text">
                    {campaign.headline}
                  </div>
                </td>

                <td>
                  <span
                    className={
                      campaign.isActive
                        ? "status active"
                        : "status paused"
                    }
                  >
                    {campaign.isActive ? "Active" : "Paused"}
                  </span>
                </td>

                <td>
                  <div>
                    Countries:{" "}
                    {displayTarget(
                      campaign.countries,
                      "All"
                    )}
                  </div>

                  <div>
                    Devices:{" "}
                    {displayTarget(
                      campaign.devices,
                      "All"
                    )}
                  </div>

                  <div>
                    Categories:{" "}
                    {displayTarget(
                      campaign.categories,
                      "All"
                    )}
                  </div>
                </td>

                <td>
                  ${campaign.bidPrice.toFixed(2)}{" "}
                  {campaign.bidType}
                </td>

                <td>
                  <div>
                    Total: $
                    {campaign.totalBudget.toFixed(2)}
                  </div>

                  <div className="secondary-text">
                    Daily: $
                    {campaign.dailyBudget.toFixed(2)}
                  </div>
                </td>

                <td>
                  ${campaign.spent.toFixed(2)}
                </td>

                <td>{campaign.impressions}</td>
                <td>{campaign.clicks}</td>

                <td>
                  <div className="row-actions">
                    <button
                      type="button"
                      onClick={() =>
                        openEditForm(campaign)
                      }
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        toggleCampaignStatus(campaign)
                      }
                    >
                      {campaign.isActive
                        ? "Pause"
                        : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
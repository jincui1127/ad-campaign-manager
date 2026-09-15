import { useEffect, useState } from "react";
import { createCampaign, updateCampaign } from "../api/client";
import type { Campaign, CampaignInput } from "../types";

interface CampaignFormProps {
  campaign: Campaign | null;
  onSaved: () => void;
  onCancel: () => void;
}

const emptyForm: CampaignInput = {
  name: "",
  headline: "",
  imageUrl: "",
  landingPageUrl: "",
  totalBudget: 100,
  dailyBudget: 20,
  bidPrice: 0.5,
  bidType: "CPI",
  countries: [],
  devices: [],
  categories: [],
};

function parseList(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];
}

export default function CampaignForm({
  campaign,
  onSaved,
  onCancel,
}: CampaignFormProps) {
  const [formData, setFormData] = useState<CampaignInput>(emptyForm);
  const [countriesText, setCountriesText] = useState("");
  const [devicesText, setDevicesText] = useState("");
  const [categoriesText, setCategoriesText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name,
        headline: campaign.headline,
        imageUrl: campaign.imageUrl,
        landingPageUrl: campaign.landingPageUrl,
        totalBudget: campaign.totalBudget,
        dailyBudget: campaign.dailyBudget,
        bidPrice: campaign.bidPrice,
        bidType: campaign.bidType,
        countries: campaign.countries,
        devices: campaign.devices,
        categories: campaign.categories,
      });

      setCountriesText(campaign.countries.join(", "));
      setDevicesText(campaign.devices.join(", "));
      setCategoriesText(campaign.categories.join(", "));
    } else {
      setFormData(emptyForm);
      setCountriesText("");
      setDevicesText("");
      setCategoriesText("");
    }

    setError("");
  }, [campaign]);

  function updateField<K extends keyof CampaignInput>(
    field: K,
    value: CampaignInput[K]
  ) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      const data: CampaignInput = {
        ...formData,
        countries: parseList(countriesText),
        devices: parseList(devicesText),
        categories: parseList(categoriesText),
      };

      if (campaign) {
        await updateCampaign(campaign.id, data);
      } else {
        await createCampaign(data);
      }

      onSaved();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save campaign"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="campaign-form-section">
      <div className="form-header">
        <h2>{campaign ? "Edit Campaign" : "Create Campaign"}</h2>

        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}

      <form className="campaign-form" onSubmit={handleSubmit}>
        <label>
          Campaign Name
          <input
            required
            value={formData.name}
            onChange={(event) =>
              updateField("name", event.target.value)
            }
          />
        </label>

        <label>
          Headline
          <input
            required
            value={formData.headline}
            onChange={(event) =>
              updateField("headline", event.target.value)
            }
          />
        </label>

        <label>
          Image URL
          <input
            required
            type="url"
            value={formData.imageUrl}
            onChange={(event) =>
              updateField("imageUrl", event.target.value)
            }
          />
        </label>

        <label>
          Landing Page URL
          <input
            required
            type="url"
            value={formData.landingPageUrl}
            onChange={(event) =>
              updateField("landingPageUrl", event.target.value)
            }
          />
        </label>

        <label>
          Total Budget
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={formData.totalBudget}
            onChange={(event) =>
              updateField("totalBudget", Number(event.target.value))
            }
          />
        </label>

        <label>
          Daily Budget
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={formData.dailyBudget}
            onChange={(event) =>
              updateField("dailyBudget", Number(event.target.value))
            }
          />
        </label>

        <label>
          Bid Price
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={formData.bidPrice}
            onChange={(event) =>
              updateField("bidPrice", Number(event.target.value))
            }
          />
        </label>

        <label>
          Bid Type
          <select
            value={formData.bidType}
            onChange={(event) =>
              updateField(
                "bidType",
                event.target.value as CampaignInput["bidType"]
              )
            }
          >
            <option value="CPI">CPI</option>
            <option value="CPC">CPC</option>
          </select>
        </label>

        <label>
          Countries
          <input
            placeholder="AU, NZ — blank = all"
            value={countriesText}
            onChange={(event) =>
              setCountriesText(event.target.value)
            }
          />
        </label>

        <label>
          Devices
          <input
            placeholder="mobile, tablet — blank = all"
            value={devicesText}
            onChange={(event) =>
              setDevicesText(event.target.value)
            }
          />
        </label>

        <label>
          Categories
          <input
            placeholder="sports, fitness — blank = all"
            value={categoriesText}
            onChange={(event) =>
              setCategoriesText(event.target.value)
            }
          />
        </label>

        <div className="form-actions">
          <button type="submit" disabled={saving}>
            {saving
              ? "Saving..."
              : campaign
                ? "Save Changes"
                : "Create Campaign"}
          </button>
        </div>
      </form>
    </section>
  );
}
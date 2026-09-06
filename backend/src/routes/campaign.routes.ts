import { Router } from "express";

import {
  campaignCreateSchema,
  campaignUpdateSchema,
} from "../schemas/campaign.schema.js";

import {
  createCampaign,
  getCampaignById,
  getCampaigns,
  updateCampaign,
} from "../services/campaign.service.js";


const router = Router();


router.post("/", async (req, res) => {
  const result = campaignCreateSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Invalid campaign data",
      details: result.error.flatten(),
    });
  }

  const campaign = await createCampaign(result.data);

  return res.status(201).json(campaign);
});


router.get("/", async (_req, res) => {
  const campaigns = await getCampaigns();

  return res.json(campaigns);
});


router.get("/:id", async (req, res) => {
  const campaignId = Number(req.params.id);

  if (!Number.isInteger(campaignId)) {
    return res.status(400).json({
      error: "Invalid campaign id",
    });
  }

  const campaign = await getCampaignById(campaignId);

  if (!campaign) {
    return res.status(404).json({
      error: "Campaign not found",
    });
  }

  return res.json(campaign);
});


router.patch("/:id", async (req, res) => {
  const campaignId = Number(req.params.id);

  if (!Number.isInteger(campaignId)) {
    return res.status(400).json({
      error: "Invalid campaign id",
    });
  }

  const existingCampaign = await getCampaignById(campaignId);

  if (!existingCampaign) {
    return res.status(404).json({
      error: "Campaign not found",
    });
  }

  const result = campaignUpdateSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Invalid campaign data",
      details: result.error.flatten(),
    });
  }

  const campaign = await updateCampaign(
    campaignId,
    result.data
  );

  return res.json(campaign);
});


export default router;
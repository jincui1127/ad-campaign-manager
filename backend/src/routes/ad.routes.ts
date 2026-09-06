import { Router } from "express";

import { adServeSchema } from "../schemas/ad.schema.js";
import { selectAd } from "../services/ad-serving.service.js";


const router = Router();


router.post("/serve", async (req, res) => {
  const result = adServeSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Invalid ad request",
      details: result.error.flatten(),
    });
  }

  const campaign = await selectAd(result.data);

  if (!campaign) {
    return res.json({
      ad: null,
      message: "No eligible ad found",
    });
  }

  return res.json({
    campaignId: campaign.id,
    headline: campaign.headline,
    imageUrl: campaign.imageUrl,
    landingPageUrl: campaign.landingPageUrl,
    bidPrice: campaign.bidPrice,
  });
});


export default router;
import { Router } from "express";
import { microsToDollars } from "../lib/money.js";
import { adServeSchema } from "../schemas/ad.schema.js";
import { selectAd } from "../services/ad-serving.service.js";
import { issueAdToken } from "../services/ad-token.service.js";

const router = Router();

router.post("/serve", async (req, res) => {
  const result = adServeSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "INVALID_AD_REQUEST",
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

  const trackingToken = issueAdToken({
    campaignId: campaign.id,
    userId: result.data.userId,
    bidType: campaign.bidType,
    bidPriceMicros: campaign.bidPriceMicros,
  });

  return res.json({
    campaignId: campaign.id,
    headline: campaign.headline,
    imageUrl: campaign.imageUrl,
    landingPageUrl: campaign.landingPageUrl,
    bidPrice: microsToDollars(
      campaign.bidPriceMicros
    ),
    bidType: campaign.bidType,
    trackingToken,
  });
});

export default router;
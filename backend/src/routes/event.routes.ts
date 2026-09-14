import {
  Router,
} from "express";

import {
  adEventSchema,
} from "../schemas/event.schema.js";

import {
  recordClick,
  recordImpression,
} from "../services/tracking.service.js";

import type {
  TrackingFailureReason,
} from "../services/tracking.service.js";


const router = Router();


const FAILURE_STATUS: Record<
  TrackingFailureReason,
  number
> = {
  CAMPAIGN_NOT_FOUND: 404,
  CAMPAIGN_PAUSED: 409,
  FREQUENCY_CAP_REACHED: 409,
  TOTAL_BUDGET_EXHAUSTED: 409,
  DAILY_BUDGET_EXHAUSTED: 409,
  NO_PRIOR_IMPRESSION: 409,
};


router.post(
  "/impression",
  async (req, res) => {
    const result =
      adEventSchema.safeParse(
        req.body
      );

    if (!result.success) {
      return res
        .status(400)
        .json({
          error:
            "INVALID_IMPRESSION_EVENT",

          details:
            result.error.flatten(),
        });
    }

    const trackingResult =
      await recordImpression(
        result.data
      );

    if (!trackingResult.ok) {
      return res
        .status(
          FAILURE_STATUS[
            trackingResult.reason
          ]
        )
        .json({
          error:
            trackingResult.reason,
        });
    }

    return res
      .status(
        trackingResult.deduped
          ? 200
          : 201
      )
      .json(
        trackingResult.event
      );
  }
);


router.post(
  "/click",
  async (req, res) => {
    const result =
      adEventSchema.safeParse(
        req.body
      );

    if (!result.success) {
      return res
        .status(400)
        .json({
          error:
            "INVALID_CLICK_EVENT",

          details:
            result.error.flatten(),
        });
    }

    const trackingResult =
      await recordClick(
        result.data
      );

    if (!trackingResult.ok) {
      return res
        .status(
          FAILURE_STATUS[
            trackingResult.reason
          ]
        )
        .json({
          error:
            trackingResult.reason,
        });
    }

    return res
      .status(
        trackingResult.deduped
          ? 200
          : 201
      )
      .json(
        trackingResult.event
      );
  }
);


export default router;
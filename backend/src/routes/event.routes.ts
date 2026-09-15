import { Router } from "express";
import type { AdEvent } from "../generated/prisma/client.js";
import { microsToDollars } from "../lib/money.js";
import { adEventSchema } from "../schemas/event.schema.js";
import {
  recordClick,
  recordImpression,
} from "../services/tracking.service.js";
import type {
  TrackingFailureReason,
} from "../services/tracking.service.js";
import {
  verifyAdToken,
} from "../services/ad-token.service.js";

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

function toEventResponse(event: AdEvent) {
  return {
    id: event.id,
    eventId: event.eventId,
    campaignId: event.campaignId,
    userId: event.userId,
    eventType: event.eventType,
    cost: microsToDollars(
      event.costMicros
    ),
    createdAt: event.createdAt,
  };
}

function verifyTrackingToken(
  token: string
) {
  const verification =
    verifyAdToken(token);

  if (!verification.ok) {
    return verification;
  }

  return verification;
}

router.post(
  "/impression",
  async (req, res) => {
    const result =
      adEventSchema.safeParse(
        req.body
      );

    if (!result.success) {
      return res.status(400).json({
        error:
          "INVALID_IMPRESSION_EVENT",
        details:
          result.error.flatten(),
      });
    }

    const verification =
      verifyTrackingToken(
        result.data.token
      );

    if (!verification.ok) {
      return res
        .status(
          verification.reason ===
            "EXPIRED_AD_TOKEN"
            ? 410
            : 400
        )
        .json({
          error:
            verification.reason,
        });
    }

    const trackingResult =
      await recordImpression(
        verification.payload
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
        toEventResponse(
          trackingResult.event
        )
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
      return res.status(400).json({
        error: "INVALID_CLICK_EVENT",
        details:
          result.error.flatten(),
      });
    }

    const verification =
      verifyTrackingToken(
        result.data.token
      );

    if (!verification.ok) {
      return res
        .status(
          verification.reason ===
            "EXPIRED_AD_TOKEN"
            ? 410
            : 400
        )
        .json({
          error:
            verification.reason,
        });
    }

    const trackingResult =
      await recordClick(
        verification.payload
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
        toEventResponse(
          trackingResult.event
        )
      );
  }
);

export default router;
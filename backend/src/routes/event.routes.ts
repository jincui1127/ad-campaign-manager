import { Router } from "express";

import { adEventSchema } from "../schemas/event.schema";
import {
  recordClick,
  recordImpression,
} from "../services/tracking.service";


const router = Router();


router.post("/impression", async (req, res) => {
  const result = adEventSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Invalid impression event",
      details: result.error.flatten(),
    });
  }

  const event = await recordImpression(result.data);

  if (!event) {
    return res.status(400).json({
      error: "Unable to record impression",
    });
  }

  return res.status(201).json(event);
});


router.post("/click", async (req, res) => {
  const result = adEventSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Invalid click event",
      details: result.error.flatten(),
    });
  }

  const event = await recordClick(result.data);

  if (!event) {
    return res.status(400).json({
      error: "Unable to record click",
    });
  }

  return res.status(201).json(event);
});


export default router;
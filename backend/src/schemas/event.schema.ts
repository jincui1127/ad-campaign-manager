import { z } from "zod";


export const adEventSchema = z.object({
  eventId: z.string().min(1),
  campaignId: z.number().int().positive(),
  userId: z.string().min(1),
});
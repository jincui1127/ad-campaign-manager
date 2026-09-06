import { z } from "zod";


export const adServeSchema = z.object({
  userId: z.string().min(1),
  country: z.string().min(1),
  device: z.string().min(1),
  category: z.string().optional(),
});
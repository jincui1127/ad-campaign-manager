import { z } from "zod";

export const adEventSchema = z.object({
  token: z.string().min(1).max(4096),
});
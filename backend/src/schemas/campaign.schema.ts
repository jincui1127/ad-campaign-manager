import { z } from "zod";


export const campaignCreateSchema = z.object({
  name: z.string().min(1),
  headline: z.string().min(1),
  imageUrl: z.string().url(),
  landingPageUrl: z.string().url(),

  totalBudget: z.number().positive(),
  dailyBudget: z.number().positive(),
  bidPrice: z.number().positive(),

  country: z.string().min(1),
  device: z.string().min(1),
  category: z.string().nullable().optional(),
});


export const campaignUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  headline: z.string().min(1).optional(),
  imageUrl: z.string().url().optional(),
  landingPageUrl: z.string().url().optional(),

  totalBudget: z.number().positive().optional(),
  dailyBudget: z.number().positive().optional(),
  bidPrice: z.number().positive().optional(),

  country: z.string().min(1).optional(),
  device: z.string().min(1).optional(),
  category: z.string().nullable().optional(),

  isActive: z.boolean().optional(),
});
import { z } from "zod";

const bidTypeSchema = z.enum(["CPI", "CPC"]);

const targetingListSchema = z
  .array(z.string().trim().min(1))
  .max(20);

export const campaignCreateSchema = z
  .object({
    name: z.string().min(1),
    headline: z.string().min(1),
    imageUrl: z.string().url(),
    landingPageUrl: z.string().url(),

    totalBudget: z.number().positive(),
    dailyBudget: z.number().positive(),
    bidPrice: z.number().positive(),
    bidType: bidTypeSchema.default("CPI"),

    countries: targetingListSchema.default([]),
    devices: targetingListSchema.default([]),
    categories: targetingListSchema.default([]),
  })
  .superRefine((data, ctx) => {
    if (data.dailyBudget > data.totalBudget) {
      ctx.addIssue({
        code: "custom",
        path: ["dailyBudget"],
        message: "Daily budget cannot exceed total budget",
      });
    }

    if (data.bidPrice > data.dailyBudget) {
      ctx.addIssue({
        code: "custom",
        path: ["bidPrice"],
        message: "Bid price cannot exceed daily budget",
      });
    }
  });

export const campaignUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    headline: z.string().min(1).optional(),
    imageUrl: z.string().url().optional(),
    landingPageUrl: z.string().url().optional(),

    totalBudget: z.number().positive().optional(),
    dailyBudget: z.number().positive().optional(),
    bidPrice: z.number().positive().optional(),
    bidType: bidTypeSchema.optional(),

    countries: targetingListSchema.optional(),
    devices: targetingListSchema.optional(),
    categories: targetingListSchema.optional(),

    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.totalBudget !== undefined &&
      data.dailyBudget !== undefined &&
      data.dailyBudget > data.totalBudget
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["dailyBudget"],
        message: "Daily budget cannot exceed total budget",
      });
    }

    if (
      data.dailyBudget !== undefined &&
      data.bidPrice !== undefined &&
      data.bidPrice > data.dailyBudget
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["bidPrice"],
        message: "Bid price cannot exceed daily budget",
      });
    }
  });

export type CampaignCreateInput = z.infer<
  typeof campaignCreateSchema
>;

export type CampaignUpdateInput = z.infer<
  typeof campaignUpdateSchema
>;
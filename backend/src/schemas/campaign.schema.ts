import { z } from "zod";

const bidTypeSchema = z.enum(["CPI", "CPC"]);

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

    country: z.string().min(1),
    device: z.string().min(1),
    category: z.string().nullable().optional(),
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

    country: z.string().min(1).optional(),
    device: z.string().min(1).optional(),
    category: z.string().nullable().optional(),

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
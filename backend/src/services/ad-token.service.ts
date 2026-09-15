import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";

const DEFAULT_TOKEN_TTL_SECONDS = 15 * 60;

const tokenPayloadSchema = z.object({
  jti: z.string().min(1),
  campaignId: z.number().int().positive(),
  userId: z.string().min(1),
  bidType: z.enum(["CPI", "CPC"]),
  bidPriceMicros: z.string().regex(/^\d+$/),
  exp: z.number().int().positive(),
});

export type AdTokenPayload = z.infer<
  typeof tokenPayloadSchema
>;

export type TokenVerificationResult =
  | {
      ok: true;
      payload: AdTokenPayload;
    }
  | {
      ok: false;
      reason:
        | "INVALID_AD_TOKEN"
        | "EXPIRED_AD_TOKEN";
    };

function getTokenSecret(): string {
  const secret = process.env.AD_TOKEN_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "AD_TOKEN_SECRET must contain at least 32 characters"
    );
  }

  return secret;
}

function createSignature(encodedPayload: string): Buffer {
  return createHmac("sha256", getTokenSecret())
    .update(encodedPayload)
    .digest();
}

export function issueAdToken(
  input: {
    campaignId: number;
    userId: string;
    bidType: "CPI" | "CPC";
    bidPriceMicros: bigint;
  },
  ttlSeconds = DEFAULT_TOKEN_TTL_SECONDS
): string {
  const payload: AdTokenPayload = {
    jti: randomUUID(),
    campaignId: input.campaignId,
    userId: input.userId,
    bidType: input.bidType,
    bidPriceMicros: input.bidPriceMicros.toString(),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const encodedPayload = Buffer.from(
    JSON.stringify(payload)
  ).toString("base64url");

  const signature = createSignature(
    encodedPayload
  ).toString("base64url");

  return `${encodedPayload}.${signature}`;
}

export function verifyAdToken(
  token: string
): TokenVerificationResult {
  const parts = token.split(".");

  if (parts.length !== 2) {
    return {
      ok: false,
      reason: "INVALID_AD_TOKEN",
    };
  }

  const [encodedPayload, encodedSignature] = parts;

  if (!encodedPayload || !encodedSignature) {
    return {
      ok: false,
      reason: "INVALID_AD_TOKEN",
    };
  }

  try {
    const expectedSignature =
      createSignature(encodedPayload);

    const receivedSignature = Buffer.from(
      encodedSignature,
      "base64url"
    );

    if (
      expectedSignature.length !==
        receivedSignature.length ||
      !timingSafeEqual(
        expectedSignature,
        receivedSignature
      )
    ) {
      return {
        ok: false,
        reason: "INVALID_AD_TOKEN",
      };
    }

    const decoded = JSON.parse(
      Buffer.from(
        encodedPayload,
        "base64url"
      ).toString("utf8")
    );

    const parsed =
      tokenPayloadSchema.safeParse(decoded);

    if (!parsed.success) {
      return {
        ok: false,
        reason: "INVALID_AD_TOKEN",
      };
    }

    if (
      parsed.data.exp <=
      Math.floor(Date.now() / 1000)
    ) {
      return {
        ok: false,
        reason: "EXPIRED_AD_TOKEN",
      };
    }

    return {
      ok: true,
      payload: parsed.data,
    };
  } catch {
    return {
      ok: false,
      reason: "INVALID_AD_TOKEN",
    };
  }
}
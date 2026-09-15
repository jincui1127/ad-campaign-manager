export const MICROS_PER_DOLLAR = 1_000_000;

export function dollarsToMicros(value: number): bigint {
  const micros = Math.round(value * MICROS_PER_DOLLAR);

  if (!Number.isSafeInteger(micros)) {
    throw new Error("Money value exceeds supported range");
  }

  return BigInt(micros);
}

export function microsToDollars(value: bigint): number {
  return Number(value) / MICROS_PER_DOLLAR;
}
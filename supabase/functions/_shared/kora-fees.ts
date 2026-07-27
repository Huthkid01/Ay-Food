/** Processing fee covering Kora deductions from the restaurant payout. */

export const KORA_FEE_LOW_NGN = 100;
export const KORA_FEE_MID_NGN = 200;
export const KORA_FEE_HIGH_NGN = 300;

export const KORA_FEE_LOW_MAX_NGN = 10000;
export const KORA_FEE_MID_MIN_NGN = 20000;
export const KORA_FEE_HIGH_MIN_NGN = 50000;

/**
 * Fee tiers (order total before fee):
 * - ₦1,000 – ₦10,000 → ₦100
 * - ₦20,000 – ₦49,999 → ₦200
 * - ₦50,000+ → ₦300
 * Amounts under ₦1,000 or between ₦10,001–₦19,999 use ₦100.
 */
export function getKoraProcessingFeeNgn(orderTotalNgn: number): number {
  const amount = Math.round(orderTotalNgn);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (amount >= KORA_FEE_HIGH_MIN_NGN) return KORA_FEE_HIGH_NGN;
  if (amount >= KORA_FEE_MID_MIN_NGN) return KORA_FEE_MID_NGN;
  return KORA_FEE_LOW_NGN;
}

export function getKoraChargeNgn(orderTotalNgn: number): number {
  const order = Math.round(orderTotalNgn);
  if (!Number.isFinite(order) || order <= 0) return 0;
  return order + getKoraProcessingFeeNgn(order);
}

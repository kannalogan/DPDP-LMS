export type UsageAllowance = { allowed: boolean; remaining: number };
export function evaluateUsageAllowance(
  limit: number,
  used: number,
  requested: number
): UsageAllowance {
  const remaining = Math.max(0, limit - used);
  return { allowed: requested >= 0 && requested <= remaining, remaining };
}

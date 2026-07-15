export type Period = "daily" | "weekly" | "monthly";

// Pure date math, kept free of vite/sanity imports so it stays runnable in
// plain node (see scripts/checkPeriodKeys.ts).
export function getPeriodKey(period: Period, date = new Date()): string {
  const iso = date.toISOString();
  if (period === "monthly") return iso.slice(0, 7);
  if (period === "daily") return iso.slice(0, 10);

  // ponytail: week buckets, not ISO week numbers. Epoch (1970-01-01) was a
  // Thursday, so +4 puts the bucket boundary on Sunday.
  const daysSinceEpoch = Math.floor(Date.parse(iso.slice(0, 10)) / 86400000);
  return `W${Math.floor((daysSinceEpoch + 4) / 7)}`;
}

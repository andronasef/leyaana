export type Period = "daily" | "weekly" | "monthly";

export const periods: Period[] = ["daily", "weekly", "monthly"];

// Pure logic, kept free of vite/sanity/localStorage imports so it runs in the
// window, in the service worker, and in plain node (scripts/checkReminders.ts).
export function getPeriodKey(period: Period, date = new Date()): string {
  const iso = date.toISOString();
  if (period === "monthly") return iso.slice(0, 7);
  if (period === "daily") return iso.slice(0, 10);

  // ponytail: week buckets, not ISO week numbers. Epoch (1970-01-01) was a
  // Thursday, so +4 puts the bucket boundary on Sunday.
  const daysSinceEpoch = Math.floor(Date.parse(iso.slice(0, 10)) / 86400000);
  return `W${Math.floor((daysSinceEpoch + 4) / 7)}`;
}

export function hashValue(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// The homepage and the service worker must land on the same verse, so both go
// through this one seed shape.
export function pickIndex(
  periodKey: string,
  userKey: string,
  typeKey: string,
  length: number,
) {
  return hashValue(`${periodKey}:${userKey}:${typeKey}`) % length;
}

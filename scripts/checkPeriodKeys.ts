// Self-check for the reminder period keys. Run: npm run check:periods
// The key doubles as the notification schedule and its dedup marker, so a
// wrong bucket boundary means a missed or repeated reminder.
import assert from "node:assert";
import { getPeriodKey } from "../src/utils/period";

const at = (value: string) => new Date(value);

// daily rolls at UTC midnight
assert.equal(getPeriodKey("daily", at("2026-07-15T23:59:59Z")), "2026-07-15");
assert.equal(getPeriodKey("daily", at("2026-07-16T00:00:00Z")), "2026-07-16");

// monthly rolls at the month boundary
assert.equal(getPeriodKey("monthly", at("2026-07-31T12:00:00Z")), "2026-07");
assert.equal(getPeriodKey("monthly", at("2026-08-01T00:00:00Z")), "2026-08");

// weekly rolls on Sunday. 2026-07-11 is a Sat, 07-12 a Sun, 07-18 the next Sat.
assert.notEqual(
  getPeriodKey("weekly", at("2026-07-11T12:00:00Z")),
  getPeriodKey("weekly", at("2026-07-12T00:00:00Z")),
  "week must roll over on Sunday",
);
assert.equal(
  getPeriodKey("weekly", at("2026-07-12T00:00:00Z")),
  getPeriodKey("weekly", at("2026-07-18T23:00:00Z")),
  "Sun..Sat must share one week bucket",
);

// and is stable across every day of that one Sun..Sat span
const span = ["12", "13", "14", "15", "16", "17", "18"].map((day) =>
  getPeriodKey("weekly", at(`2026-07-${day}T06:00:00Z`)),
);
assert.equal(new Set(span).size, 1, `one bucket expected, got ${span}`);

console.log("ok: daily/weekly/monthly period keys bucket correctly");

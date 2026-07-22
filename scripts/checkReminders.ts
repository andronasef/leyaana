// Self-check for the reminder scheduling logic. Run: npm run check:reminders
// The period key doubles as both the schedule and the dedup marker, and the
// same dueReminders() runs in the page and in the service worker, so a wrong
// bucket boundary means a missed, repeated, or double-fired reminder.
import assert from "node:assert";
import { getPeriodKey } from "../src/utils/period";
import {
  ReminderState,
  dueReminders,
  markShown,
} from "../src/utils/reminderCore";

const at = (value: string) => new Date(value);

// --- period keys ---

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
const span = ["12", "13", "14", "15", "16", "17", "18"].map((day) =>
  getPeriodKey("weekly", at(`2026-07-${day}T06:00:00Z`)),
);
assert.equal(new Set(span).size, 1, `one week bucket expected, got ${span}`);

// --- dueReminders ---

const state = (over: Partial<ReminderState> = {}): ReminderState => ({
  enabled: { daily: true, weekly: true, monthly: true },
  lastShown: {},
  userKey: "tester",
  verses: ["verse one", "verse two", "verse three"],
  ...over,
});

// Local time drives the 9am gate, so build local (not Z) timestamps here.
const before9 = new Date(2026, 6, 15, 8, 59);
const at9 = new Date(2026, 6, 15, 9, 0);
const later = new Date(2026, 6, 15, 13, 0);

assert.equal(dueReminders(state(), before9).length, 0, "nothing before 9am");
assert.ok(dueReminders(state(), at9).length > 0, "fires at exactly 9:00");
assert.ok(
  dueReminders(state(), later).length > 0,
  "still fires later that day",
);

// disabled periods never fire
assert.deepEqual(
  dueReminders(
    state({ enabled: { daily: true, weekly: false, monthly: false } }),
    later,
  ).map((due) => due.period),
  ["daily"],
  "only enabled periods fire",
);

// no verses loaded yet -> nothing to send
assert.equal(dueReminders(state({ verses: [] }), later).length, 0);

// dedup: marking shown suppresses it for the rest of the period, and the page
// and worker both fold through markShown, so neither can double-fire.
const daily = dueReminders(
  state({ enabled: { daily: true, weekly: false, monthly: false } }),
  later,
)[0];
const marked = markShown(
  state({ enabled: { daily: true, weekly: false, monthly: false } }),
  daily,
);
assert.equal(dueReminders(marked, later).length, 0, "shown once per period");

// ...but the next day is a new key, so it fires again
const nextDay = new Date(2026, 6, 16, 9, 30);
assert.equal(dueReminders(marked, nextDay).length, 1, "new day fires again");

// preview (the force test) bypasses both gates but must still return the exact
// reminder the real 9am run would, or the test would prove the wrong thing.
assert.equal(
  dueReminders(state(), before9, true).length,
  3,
  "preview ignores the hour",
);
assert.equal(
  dueReminders(marked, later, true)[0].body,
  daily.body,
  "preview ignores dedup and keeps the same verse",
);
assert.equal(
  dueReminders(
    state({ enabled: { daily: false, weekly: false, monthly: false } }),
    later,
    true,
  ).length,
  0,
  "preview still respects disabled periods",
);

// the verse is stable within a period and independent of time of day
assert.equal(
  dueReminders(state(), at9)[0].body,
  dueReminders(state(), later)[0].body,
  "same verse all period",
);

console.log(
  "ok: period keys bucket correctly and dueReminders gates as expected",
);

import { Period, getPeriodKey, periods, pickIndex } from "./period";

export const REMINDER_HOUR = 9;
export const REMINDER_MINUTE = 0;

export const reminderTitles: Record<Period, string> = {
  daily: "آية النهارده",
  weekly: "آية الأسبوع",
  monthly: "آية الشهر",
};

// Mirrored into IndexedDB by the app, because the service worker cannot read
// localStorage. Verses arrive already parsed (gender/name substituted), so the
// worker never needs settings or the network to pick one.
export type ReminderState = {
  enabled: Record<Period, boolean>;
  lastShown: Partial<Record<Period, string>>;
  userKey: string;
  verses: string[];
};

export type DueReminder = {
  period: Period;
  periodKey: string;
  title: string;
  body: string;
};

export const emptyReminderState: ReminderState = {
  enabled: { daily: false, weekly: false, monthly: false },
  lastShown: {},
  userKey: "",
  verses: [],
};

export function isReminderTimeReached(now: Date) {
  if (now.getHours() !== REMINDER_HOUR) {
    return now.getHours() > REMINDER_HOUR;
  }

  return now.getMinutes() >= REMINDER_MINUTE;
}

// Pure so both the in-app watcher and the service worker's periodicsync handler
// reach the same verdict, and so it can be asserted in plain node.
export function dueReminders(state: ReminderState, now: Date): DueReminder[] {
  if (!state.verses.length || !isReminderTimeReached(now)) {
    return [];
  }

  return periods.flatMap((period) => {
    if (!state.enabled[period]) return [];

    const periodKey = getPeriodKey(period, now);
    if (state.lastShown[period] === periodKey) return [];

    const body =
      state.verses[
        pickIndex(periodKey, state.userKey, "verse", state.verses.length)
      ];

    return body
      ? [{ period, periodKey, title: reminderTitles[period], body }]
      : [];
  });
}

export function markShown(
  state: ReminderState,
  due: DueReminder,
): ReminderState {
  return {
    ...state,
    lastShown: { ...state.lastShown, [due.period]: due.periodKey },
  };
}

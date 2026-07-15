import {
  Period,
  getPeriodItem,
  getPeriodKey,
  getVerses,
  parseVerse,
} from "./api";
import { SettingsList, getSetting, setSetting } from "./settings";

const REMINDER_HOUR = 9;
const REMINDER_MINUTE = 0;

export type NotificationSupportState = NotificationPermission | "unsupported";

type ReminderConfig = {
  enabledSetting: SettingsList;
  lastShownSetting: SettingsList;
  title: string;
};

export const reminders: Record<Period, ReminderConfig> = {
  daily: {
    enabledSetting: SettingsList.dailyNotificationEnabled,
    lastShownSetting: SettingsList.dailyNotificationLastShownOn,
    title: "آية النهارده",
  },
  weekly: {
    enabledSetting: SettingsList.weeklyNotificationEnabled,
    lastShownSetting: SettingsList.weeklyNotificationLastShownOn,
    title: "آية الأسبوع",
  },
  monthly: {
    enabledSetting: SettingsList.monthlyNotificationEnabled,
    lastShownSetting: SettingsList.monthlyNotificationLastShownOn,
    title: "آية الشهر",
  },
};

export const reminderPeriods = Object.keys(reminders) as Period[];

function isReminderTimeReached(date = new Date()) {
  if (date.getHours() > REMINDER_HOUR) {
    return true;
  }

  if (date.getHours() < REMINDER_HOUR) {
    return false;
  }

  return date.getMinutes() >= REMINDER_MINUTE;
}

export function isReminderEnabled(period: Period) {
  return getSetting<string>(reminders[period].enabledSetting) === "true";
}

export function getNotificationSupportState(): NotificationSupportState {
  if (typeof window === "undefined" || typeof Notification === "undefined") {
    return "unsupported";
  }

  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (getNotificationSupportState() === "unsupported") {
    return "unsupported" as const;
  }

  const permission = await Notification.requestPermission();
  return permission;
}

async function showVerseNotification(
  period: Period,
  title: string,
  body: string,
) {
  const options: NotificationOptions = {
    body,
    icon: "/pwa-192x192.png",
    tag: `verse-reminder-${period}`,
  };

  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && typeof registration.showNotification === "function") {
        await registration.showNotification(title, {
          ...options,
          badge: "/pwa-64x64.png",
        });
        return;
      }
    } catch {
      // Fall back to regular Notification below.
    }
  }

  new Notification(title, options);
}

export async function maybeShowVerseReminder(period: Period) {
  if (!isReminderEnabled(period)) {
    return;
  }

  if (!isReminderTimeReached()) {
    return;
  }

  if (getNotificationSupportState() !== "granted") {
    return;
  }

  // The period key doubles as the schedule: it only changes at the period
  // boundary, so one notification per day/week/month falls out of the dedup.
  const periodKey = getPeriodKey(period);
  const { lastShownSetting, title } = reminders[period];
  if (getSetting<string>(lastShownSetting) === periodKey) {
    return;
  }

  const picked = getPeriodItem(await getVerses(), "verse", period);
  if (!picked) {
    return;
  }

  await showVerseNotification(period, title, parseVerse(picked).verse);
  setSetting(lastShownSetting, periodKey);
}

export async function maybeShowVerseReminders() {
  for (const period of reminderPeriods) {
    await maybeShowVerseReminder(period);
  }
}

export function startVerseReminderWatcher() {
  void maybeShowVerseReminders();

  const intervalId = window.setInterval(() => {
    void maybeShowVerseReminders();
  }, 60 * 1000);

  return () => {
    window.clearInterval(intervalId);
  };
}

export function getReminderTimeLabel() {
  return "9:00 صباحًا";
}

import { getPersonName, getVerses, parseVerse } from "./api";
import { Period, periods } from "./period";
import {
  DueReminder,
  REMINDER_HOUR,
  dueReminders,
  markShown,
  periodTitles,
} from "./reminderCore";
import { readReminderState, updateReminderState } from "./reminderStore";
import { SettingsList, getSetting } from "./settings";

export type NotificationSupportState = NotificationPermission | "unsupported";

export const reminderPeriods = periods;

export const reminders: Record<
  Period,
  { enabledSetting: SettingsList; title: string }
> = {
  daily: {
    enabledSetting: SettingsList.dailyNotificationEnabled,
    title: periodTitles.daily,
  },
  weekly: {
    enabledSetting: SettingsList.weeklyNotificationEnabled,
    title: periodTitles.weekly,
  },
  monthly: {
    enabledSetting: SettingsList.monthlyNotificationEnabled,
    title: periodTitles.monthly,
  },
};

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

  return await Notification.requestPermission();
}

// The worker cannot read localStorage or reach Sanity on its own, so the page
// pushes everything it needs into IndexedDB whenever it has fresh data.
export async function syncReminderState() {
  const verses = (await getVerses()).map((verse) => parseVerse(verse).verse);
  const userKey = getPersonName();

  await updateReminderState((current) => ({
    ...current,
    enabled: {
      daily: isReminderEnabled("daily"),
      weekly: isReminderEnabled("weekly"),
      monthly: isReminderEnabled("monthly"),
    },
    userKey,
    verses,
  }));
}

async function showReminder(due: DueReminder) {
  const options: NotificationOptions = {
    body: due.body,
    icon: "/pwa-192x192.png",
    tag: `verse-reminder-${due.period}`,
  };

  const registration =
    typeof navigator !== "undefined" && "serviceWorker" in navigator
      ? await navigator.serviceWorker.getRegistration().catch(() => undefined)
      : undefined;

  if (registration?.showNotification) {
    await registration.showNotification(due.title, {
      ...options,
      badge: "/pwa-64x64.png",
    });
    return;
  }

  new Notification(due.title, options);
}

export async function maybeShowVerseReminders(now = new Date()) {
  if (getNotificationSupportState() !== "granted") {
    return;
  }

  for (const due of dueReminders(await readReminderState(), now)) {
    await showReminder(due);
    await updateReminderState((current) => markShown(current, due));
  }
}

export async function refreshAndShowReminders() {
  await syncReminderState();
  await maybeShowVerseReminders();
}

// Push keys travel as base64url; PushManager wants raw bytes.
function urlBase64ToUint8Array(value: string) {
  const padded = (value + "=".repeat((4 - (value.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

// The one path that actually fires while the app is closed: the device holds a
// push subscription, and an external scheduler pokes /api/push once an hour so
// the server can knock on whoever is at 9am local. Idempotent — safe to call on
// every permission grant and toggle.
export async function subscribeToPush() {
  const applicationServerKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

  if (
    !applicationServerKey ||
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator) ||
    getNotificationSupportState() !== "granted"
  ) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.pushManager) {
      return false;
    }

    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(applicationServerKey),
      }));

    const response = await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        // Lets the server knock at the user's 9am instead of blasting everyone
        // hourly, which browsers punish as silent pushes.
        tzOffset: new Date().getTimezoneOffset(),
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

// Best-effort background delivery. Chrome decides if and when periodicsync
// actually fires, so the in-page watcher below stays as the reliable path.
export async function registerPeriodicReminderSync() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if (!registration.periodicSync) {
      return false;
    }

    const status = await navigator.permissions.query({
      name: "periodic-background-sync" as PermissionName,
    });
    if (status.state !== "granted") {
      return false;
    }

    await registration.periodicSync.register("verse-reminders", {
      minInterval: 60 * 60 * 1000,
    });
    return true;
  } catch {
    return false;
  }
}

export function startVerseReminderWatcher() {
  void refreshAndShowReminders();
  void subscribeToPush();
  void registerPeriodicReminderSync();

  const intervalId = window.setInterval(() => {
    void maybeShowVerseReminders();
  }, 60 * 1000);

  return () => {
    window.clearInterval(intervalId);
  };
}

export function getReminderTimeLabel() {
  return `${REMINDER_HOUR}:00 صباحًا`;
}

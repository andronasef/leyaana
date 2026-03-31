import { SettingsList, getSetting, setSetting } from "./settings";

const DAILY_REMINDER_HOUR = 9;
const DAILY_REMINDER_MINUTE = 0;

export type NotificationSupportState = NotificationPermission | "unsupported";

function getTodayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isReminderTimeReached(date = new Date()) {
  if (date.getHours() > DAILY_REMINDER_HOUR) {
    return true;
  }

  if (date.getHours() < DAILY_REMINDER_HOUR) {
    return false;
  }

  return date.getMinutes() >= DAILY_REMINDER_MINUTE;
}

function isDailyReminderEnabled() {
  return getSetting<string>(SettingsList.dailyNotificationEnabled) === "true";
}

function getLastShownDay() {
  return getSetting<string>(SettingsList.dailyNotificationLastShownOn);
}

function setLastShownDay(dayKey: string) {
  setSetting(SettingsList.dailyNotificationLastShownOn, dayKey);
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

async function showReminderNotification() {
  const title = "ليا انا";
  const body = "بركة النهاردة جاهزة لك. افتح التطبيق وشوف رسالة اليوم.";

  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && typeof registration.showNotification === "function") {
        await registration.showNotification(title, {
          body,
          icon: "/pwa-192x192.png",
          badge: "/pwa-64x64.png",
          tag: "daily-reminder-9am",
        });
        return;
      }
    } catch {
      // Fall back to regular Notification below.
    }
  }

  new Notification(title, {
    body,
    icon: "/pwa-192x192.png",
    tag: "daily-reminder-9am",
  });
}

export async function maybeShowDailyReminderAtNine() {
  if (!isDailyReminderEnabled()) {
    return;
  }

  if (!isReminderTimeReached()) {
    return;
  }

  const support = getNotificationSupportState();
  if (support !== "granted") {
    return;
  }

  const todayKey = getTodayKey();
  if (getLastShownDay() === todayKey) {
    return;
  }

  await showReminderNotification();
  setLastShownDay(todayKey);
}

export function startDailyReminderWatcher() {
  void maybeShowDailyReminderAtNine();

  const intervalId = window.setInterval(() => {
    void maybeShowDailyReminderAtNine();
  }, 60 * 1000);

  return () => {
    window.clearInterval(intervalId);
  };
}

export function getDailyReminderTimeLabel() {
  return "9:00 صباحًا";
}

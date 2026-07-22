/// <reference lib="webworker" />
import { clientsClaim, setCacheNameDetails } from "workbox-core";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { ExpirationPlugin } from "workbox-expiration";
import { NetworkFirst, NetworkOnly } from "workbox-strategies";
import { dueReminders, markShown, periodTitles } from "./utils/reminderCore";
import { readReminderState, writeReminderState } from "./utils/reminderStore";

declare const self: ServiceWorkerGlobalScope;

interface PeriodicSyncEvent extends ExtendableEvent {
  tag: string;
}

const CACHE_PREFIX = "leyaana";
const CACHE_VERSION = "v1";

setCacheNameDetails({ prefix: CACHE_PREFIX, suffix: CACHE_VERSION });

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")));

registerRoute(
  /^https:\/\/[^/]+\.(api|apicdn)\.sanity\.io\/v\d{4}-\d{2}-\d{2}\/data\/query\//,
  new NetworkFirst({
    cacheName: `${CACHE_PREFIX}-sanity-query-${CACHE_VERSION}`,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24,
      }),
    ],
  }),
  "GET",
);

registerRoute(/\/api\/content/, new NetworkOnly(), "POST");
registerRoute(/\/api\/content/, new NetworkOnly(), "PATCH");
registerRoute(/\/api\/content/, new NetworkOnly(), "DELETE");

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                (key.startsWith(CACHE_PREFIX + "-") &&
                  !key.endsWith("-" + CACHE_VERSION)) ||
                key === "sanity-query-cache",
            )
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});

// Best-effort background delivery: Chrome alone decides whether and when this
// fires (installed PWA + site engagement only, never on iOS), so a miss is
// expected and the in-page watcher remains the reliable path. Everything is read
// from IndexedDB because a worker has no localStorage. showNotification rejects
// on its own if permission was revoked, and letting it throw is what we want:
// the reminder then stays unmarked and is retried next time.
async function showDueReminders() {
  for (const due of dueReminders(await readReminderState(), new Date())) {
    await self.registration.showNotification(due.title, {
      body: due.body,
      icon: "/pwa-192x192.png",
      badge: "/pwa-64x64.png",
      tag: `verse-reminder-${due.period}`,
    });
    // Re-read before writing: the page may have shown one in the meantime.
    await writeReminderState(markShown(await readReminderState(), due));
  }
}

// The reliable path: /api/push knocks once a day around the user's 9am and the
// worker wakes even with the app closed. The knock carries no payload on
// purpose — everything needed to pick the verse is already in IndexedDB, so no
// verse or personal data ever passes through the server.
self.addEventListener("push", (event) => {
  // The one exception to the empty knock: /api/push?force=1 sends "test" so
  // delivery can be proven outside the 9am window.
  if (event.data?.text() === "test") {
    event.waitUntil(
      self.registration.showNotification(periodTitles.daily, {
        body: "التنبيهات شغالة ✅",
        icon: "/pwa-192x192.png",
        badge: "/pwa-64x64.png",
        tag: "verse-reminder-test",
      }),
    );
    return;
  }

  event.waitUntil(showDueReminders());
});

self.addEventListener("periodicsync", (event) => {
  const syncEvent = event as PeriodicSyncEvent;
  if (syncEvent.tag !== "verse-reminders") {
    return;
  }

  syncEvent.waitUntil(showDueReminders());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return self.clients.openWindow("/");
      }),
  );
});

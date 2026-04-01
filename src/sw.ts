/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { ExpirationPlugin } from "workbox-expiration";
import { NetworkFirst, NetworkOnly } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html")));

registerRoute(
  /^https:\/\/[^/]+\.(api|apicdn)\.sanity\.io\/v\d{4}-\d{2}-\d{2}\/data\/query\//,
  new NetworkFirst({
    cacheName: "sanity-query-cache",
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

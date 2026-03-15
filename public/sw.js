/// <reference lib="webworker" />

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const { title, body, url, tag } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/dotanLogo.png",
      badge: "/dotanLogo.png",
      tag: tag || "dotan-notification",
      data: { url: url || "/dashboard" },
      dir: "rtl",
      lang: "he",
      vibrate: [200, 100, 200],
      requireInteraction: false,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/dashboard";
  const fullUrl = new URL(url, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // If app is already open, navigate it
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          // Post message so the app can navigate via router
          client.postMessage({ type: "NOTIFICATION_CLICK", url });
          return client.focus();
        }
      }
      // No open tab — open new window
      return self.clients.openWindow(fullUrl);
    })
  );
});

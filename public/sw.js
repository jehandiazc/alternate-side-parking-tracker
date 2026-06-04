// ParkShare Service Worker — Push Notification Handler
// Handles push events (show OS notification) and notificationclick (open/focus app).

self.addEventListener('install', () => {
  // Take control immediately — no need to wait for old SW to expire
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim all open clients so push works right away on first registration
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { title: 'ParkShare', body: event.data?.text() ?? '' };
  }

  const title = data.title ?? 'ParkShare';
  const options = {
    body: data.body ?? '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag ?? 'parkshare',      // collapses duplicates in the notification tray
    renotify: !!data.tag,              // vibrate/ring again if tag matches an existing one
    data: { url: data.url ?? '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If the app is already open, focus it and navigate
        const existing = clientList.find(
          (c) => c.url.startsWith(self.registration.scope)
        );
        if (existing) {
          existing.focus();
          return existing.navigate(targetUrl);
        }
        // Otherwise open a new tab
        return self.clients.openWindow(targetUrl);
      })
  );
});

/* PandaFit service worker — web push only (no offline caching yet). */
self.addEventListener("push", (event) => {
  let data = { title: "PandaFit", body: "", url: "/app" };
  try { data = { ...data, ...event.data.json() }; } catch (_) {}
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, icon: "/icon.svg", badge: "/icon.svg", data: { url: data.url } }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/app", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if (c.url === url && "focus" in c) return c.focus();
      return self.clients.openWindow(url);
    }),
  );
});

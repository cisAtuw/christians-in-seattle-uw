// Service worker.
// - Pages, scripts and data: network first, so updates show up right away; falls back to cache, then to offline.html.
// - Images: cache first.
// - Push and badge handlers are ready for a future notification server.
const CACHE = "cisuw-v2";
const META = "cisuw-meta";
const PRECACHE = [
  "offline.html", "index.html", "events.html", "bible-study.html", "about.html", "contact.html",
  "css/site.css", "js/app.js", "js/i18n.js", "js/schedule.js", "js/interest.js", "js/install.js",
  "data/site.js", "data/i18n.js", "data/events.js", "data/weekly-schedule.js",
  "images/branding/icon-192.png", "images/branding/favicon.svg"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => {})))));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== META).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const isImage = /\.(jpe?g|png|svg|webp|gif|ico)$/i.test(url.pathname);
  if (isImage) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      }))
    );
    return;
  }
  e.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }).catch(async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      if (req.mode === "navigate") return caches.match("offline.html");
      return Response.error();
    })
  );
});

// ---- "Something new this week" badge ----
async function dataHash() {
  const parts = await Promise.all(
    ["data/weekly-schedule.js", "data/events.js"].map((u) => fetch(u, { cache: "no-store" }).then((r) => r.text()))
  );
  let h = 0;
  for (const ch of parts.join("|")) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return String(h);
}

async function checkForUpdates() {
  try {
    const now = await dataHash();
    const meta = await caches.open(META);
    const seen = await meta.match("seen-hash");
    const before = seen ? await seen.text() : null;
    if (before && before !== now && self.navigator.setAppBadge) await self.navigator.setAppBadge(1);
  } catch (err) { /* offline: leave the badge as it is */ }
}

self.addEventListener("periodicsync", (e) => {
  if (e.tag === "check-updates") e.waitUntil(checkForUpdates());
});

// ---- Push notifications (needs a push server; see the notification plan) ----
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data.json(); } catch (err) { /* plain text or empty */ }
  e.waitUntil(Promise.all([
    self.registration.showNotification(d.title || "Christians in Seattle at UW", {
      body: d.body || "",
      icon: "images/branding/icon-192.png",
      badge: "images/branding/icon-192.png",
      data: { url: d.url || "./" }
    }),
    self.navigator.setAppBadge ? self.navigator.setAppBadge(1).catch(() => {}) : Promise.resolve()
  ]));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = new URL(e.notification.data?.url || "./", self.registration.scope).href;
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if ("focus" in c) { c.navigate(target); return c.focus(); }
    return clients.openWindow(target);
  }));
});

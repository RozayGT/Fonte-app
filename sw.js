// Service worker FONTE — reçoit les notifications push envoyées par le
// serveur de rappels et les affiche, même si l'app est fermée.
// Ce fichier doit être servi à la racine de ton site (même dossier que
// Fonte-Ami.html), sinon son "scope" ne couvrira pas ta page.

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// ---------------------------------------------------------------------------
// Chargement de la page : on va TOUJOURS voir le reseau en premier.
// Sans cela, iOS sert indefiniment l'index.html qu'il a mis en cache et les
// nouvelles versions n'arrivent jamais sans desinstaller l'app.
// Le cache ne sert que de filet de securite quand le telephone est hors ligne.
// ---------------------------------------------------------------------------
const HTML_CACHE = "fonte-html-v1";

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const isPage = req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");
  if (!isPage) return;

  event.respondWith(
    fetch(req, { cache: "no-store" })
      .then((res) => {
        const copy = res.clone();
        caches.open(HTML_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match("./")))
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "FONTE", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "FONTE";
  const options = {
    body: data.body || "",
    tag: data.tag || "fonte-notification",
    renotify: false,
    data: { url: data.url || self.registration.scope }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || self.registration.scope;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

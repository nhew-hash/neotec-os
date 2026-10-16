/* Neotec OS — service worker do app no celular.
 * Só cuida das notificações (chegam com o app fechado) e de abrir a tela certa ao tocar.
 * Não guarda páginas em cache: o sistema sempre mostra dados ao vivo. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let dados = {};
  try {
    dados = event.data ? event.data.json() : {};
  } catch (e) {
    dados = { titulo: "Neotec OS", corpo: event.data ? event.data.text() : "" };
  }
  const url = typeof dados.url === "string" && dados.url.startsWith("/") && !dados.url.startsWith("//") ? dados.url : "/comunicacao";
  event.waitUntil(
    self.registration.showNotification(dados.titulo || "Neotec OS", {
      body: dados.corpo || "",
      tag: dados.tag || undefined,
      renotify: !!dados.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL((event.notification.data && event.notification.data.url) || "/comunicacao", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const j of janelas) {
        if (new URL(j.url).origin === self.location.origin && "focus" in j) {
          return j.focus().then((f) => (f && "navigate" in f ? f.navigate(destino) : undefined));
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});

/* ====================================================================
   PlantCare — Service Worker
   --------------------------------------------------------------------
   Permite que la app funcione completamente sin conexión tras la
   primera carga. Estrategia "cache-first" para el núcleo de la app.

   Para forzar una actualización en los dispositivos ya instalados,
   incrementa CACHE_VERSION: al activarse, el SW borra las cachés
   antiguas y vuelve a guardar los archivos.

   Todas las rutas son RELATIVAS (sin "/" inicial) para que la app
   funcione en GitHub Pages bajo un subdirectorio (/usuario/repo/).
   ==================================================================== */
"use strict";

// 🔁 Cambia esta versión cuando modifiques index.html, app.js, styles.css…
const CACHE_VERSION = "plantcare-v1";

// Archivos que forman el "núcleo" de la app (precache).
// Rutas relativas a la ubicación del propio service worker.
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png",
];

/* ---------------- Instalación: precache del núcleo ---------------- */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
  );
  // Activa el SW nuevo sin esperar a que se cierren las pestañas antiguas.
  self.skipWaiting();
});

/* ---------------- Activación: limpiar versiones anteriores ---------------- */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ---------------- Fetch: cache-first ---------------- */
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Solo gestionamos peticiones GET del mismo origen.
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached; // 1) servir desde caché si existe

      // 2) si no está en caché, ir a la red y guardar una copia
      return fetch(request)
        .then((response) => {
          // Solo cacheamos respuestas válidas y básicas (mismo origen)
          if (response && response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          // 3) sin red y sin caché: para navegaciones, devolvemos index.html
          if (request.mode === "navigate") {
            return caches.match("./index.html");
          }
          return undefined;
        });
    })
  );
});

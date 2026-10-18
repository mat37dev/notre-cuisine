// Service worker de « Notre cuisine » : permet de relire les recettes déjà ouvertes sans réseau.
// Jamais mis en cache : l'administration, les invitations, les routes cron, le partage et tout ce qui n'est pas un GET.
const VERSION = "nc-v1";
const STATIQUE = VERSION + "-statique";
const PAGES = VERSION + "-pages";

const IGNORER = [/^\/admin(\/|$)/, /^\/invite\//, /^\/api\/admin(\/|$)/, /^\/api\/cron(\/|$)/, /^\/api\/sante$/, /^\/ajouter\/partage/];

const PAGE_HORS_LIGNE =
  '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<title>Hors ligne</title><body style="font-family:system-ui;max-width:28rem;margin:4rem auto;padding:0 1rem">' +
  "<h1>Pas de réseau</h1><p>Cette page n’a pas encore été ouverte avec du réseau. Les recettes déjà consultées restent disponibles.</p></body></html>";

function classer(url, methode, origine) {
  const u = new URL(url);
  if (methode !== "GET" || u.origin !== origine) return "ignorer";
  if (IGNORER.some((r) => r.test(u.pathname))) return "ignorer";
  if (u.pathname.startsWith("/_next/static/") || /^\/icon[-\w]*\.(png|svg)$/.test(u.pathname)) return "statique";
  return "reseau";
}
self.__ncClasser = classer;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((noms) => Promise.all(noms.filter((n) => !n.startsWith(VERSION)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // les requêtes RSC (navigation interne de Next) ne sont pas gardées : on évite de mélanger avec les pages complètes
  if (req.headers.get("RSC")) return;
  const type = classer(req.url, req.method, self.location.origin);
  if (type === "ignorer") return;
  event.respondWith(type === "statique" ? cacheDAbord(req) : reseauPuisCache(req));
});

async function garder(cache, req, res) {
  if (!res.ok) return;
  try {
    await cache.put(req, res.clone());
  } catch (e) {
    // réponse non gardable (Vary: *…) : tant pis
  }
}

async function cacheDAbord(req) {
  const cache = await caches.open(STATIQUE);
  const trouve = await cache.match(req);
  if (trouve) return trouve;
  const res = await fetch(req);
  await garder(cache, req, res);
  return res;
}

async function reseauPuisCache(req) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(req);
    await garder(cache, req, res);
    return res;
  } catch (e) {
    const trouve = await cache.match(req);
    if (trouve) return trouve;
    if (req.mode === "navigate") {
      return new Response(PAGE_HORS_LIGNE, { status: 503, headers: { "content-type": "text/html; charset=utf-8" } });
    }
    throw e;
  }
}

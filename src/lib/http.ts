import { DEVICE_COOKIE, getTokenViewer, getViewer, hashToken, VISITOR, type Viewer } from "./auth";
import type { Store } from "./store/types";

export function cookieValue(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) {
      const brut = part.slice(i + 1).trim();
      try {
        return decodeURIComponent(brut);
      } catch {
        return brut; // valeur mal encodée : un jeton inconnu, donc simple visiteur
      }
    }
  }
  return undefined;
}

/** Le jeton de « Authorization: Bearer <jeton> », ou `undefined` si l'en-tête est absent ou d'un autre type. */
function bearerToken(header: string | null): string | undefined {
  const m = header?.match(/^\s*bearer\s+(\S+)\s*$/i);
  return m?.[1];
}

/** Qui appelle : un jeton d'accès (Claude) s'il y en a un, sinon l'appareil reconnu par son cookie, sinon un visiteur. */
export async function viewerFromRequest(request: Request, store: Store): Promise<Viewer> {
  const jeton = bearerToken(request.headers.get("authorization"));
  if (jeton) return (await getTokenViewer(store, jeton)) ?? { ...VISITOR, jetonInvalide: true };
  return getViewer(store, cookieValue(request.headers.get("cookie"), DEVICE_COOKIE));
}

/** Un jeton inconnu ou retiré ne doit pas se faire passer pour un simple visiteur : on répond 401, clairement. */
export function refusJeton(viewer: Viewer): Response | null {
  return viewer.jetonInvalide
    ? json({ erreur: "Ce jeton est inconnu ou a été retiré. Demande-en un nouveau dans « Mon compte »." }, 401)
    : null;
}

/** Adresse IP de l'appelant, hachée avec un sel : on ne garde jamais l'adresse elle-même. */
export function clientIpHash(request: Request): string {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "inconnue";
  return hashToken(`${process.env.IP_HASH_SALT ?? ""}${ip}`);
}

export const originOf = (request: Request): string => new URL(request.url).origin;

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

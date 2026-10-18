import { DEVICE_COOKIE, getViewer, hashToken, type Viewer } from "./auth";
import type { Store } from "./store/types";

export function cookieValue(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

export function viewerFromRequest(request: Request, store: Store): Promise<Viewer> {
  return getViewer(store, cookieValue(request.headers.get("cookie"), DEVICE_COOKIE));
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

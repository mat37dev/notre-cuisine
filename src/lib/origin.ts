import { headers } from "next/headers";

/**
 * Adresse du site affichée dans les pages : celle où la personne est connectée (nom de domaine perso ou adresse
 * Vercel), déduite de la requête. SITE_URL ne sert que s'il n'y a pas de requête à lire.
 */
export async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

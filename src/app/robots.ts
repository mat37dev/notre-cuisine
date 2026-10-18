import type { MetadataRoute } from "next";

/**
 * Le site doit pouvoir être lu par Claude (qui respecte robots.txt) : on autorise donc tout, sauf les pages
 * d'administration et les liens d'invitation. Les moteurs de recherche restent tenus à l'écart par l'en-tête
 * `X-Robots-Tag: noindex` posé sur toutes les pages (voir next.config.ts).
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/admin", "/invite/"] } };
}

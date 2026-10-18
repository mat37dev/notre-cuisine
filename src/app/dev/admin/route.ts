import { NextResponse } from "next/server";
import { DEVICE_COOKIE } from "@/lib/auth";

/**
 * Démonstration locale : un lien qui connecte en administrateur de démonstration.
 * N'existe qu'en développement ; en production la route répond 404 et ne donne aucun cookie.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  const res = NextResponse.redirect(new URL("/", request.url), 303);
  res.cookies.set(DEVICE_COOKIE, "dev-admin", { path: "/", sameSite: "lax" });
  return res;
}

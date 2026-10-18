import { NextResponse } from "next/server";
import { claimInvite, DEVICE_COOKIE, DEVICE_COOKIE_MAX_AGE } from "@/lib/auth";
import { getStore } from "@/lib/store";

export async function GET(request: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const r = await claimInvite(getStore(), token);
  if (!r.ok) {
    const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Invitation</title><body style="font-family:system-ui;max-width:28rem;margin:4rem auto;padding:0 1rem"><h1>Invitation impossible</h1><p>${r.erreur}</p><p>Demande un nouveau lien à Mathieu.</p></body></html>`;
    return new Response(html, { status: 410, headers: { "content-type": "text/html; charset=utf-8" } });
  }
  const res = NextResponse.redirect(new URL("/", request.url), 303);
  res.cookies.set(DEVICE_COOKIE, r.deviceToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
  });
  return res;
}

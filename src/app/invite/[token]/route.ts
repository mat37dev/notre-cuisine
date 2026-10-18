import { NextResponse } from "next/server";
import { claimInvite, DEVICE_COOKIE, DEVICE_COOKIE_MAX_AGE } from "@/lib/auth";
import { getStore } from "@/lib/store";

const PAGE = (titre: string, corps: string) =>
  `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titre}</title><body style="font-family:system-ui;max-width:28rem;margin:4rem auto;padding:0 1rem">${corps}</body></html>`;

const ENTETES = {
  "content-type": "text/html; charset=utf-8",
  "cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow",
};

/**
 * Ouvrir le lien ne reconnaît PAS l'appareil : les messageries (WhatsApp, Messenger…) ouvrent les liens
 * pour fabriquer un aperçu et brûleraient l'invitation avant la vraie personne. Il faut appuyer sur le bouton.
 */
export async function GET() {
  const html = PAGE(
    "Invitation",
    `<h1>Notre cuisine</h1><p>Tu as reçu une invitation. Appuie sur le bouton pour que cet appareil soit reconnu : tes recettes seront publiées tout de suite.</p><form method="post"><button type="submit" style="font-size:1.1rem;padding:.8rem 1.2rem;border:0;border-radius:.5rem;background:#ea580c;color:#fff">Reconnaître cet appareil</button></form>`,
  );
  return new Response(html, { headers: ENTETES });
}

export async function POST(request: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const r = await claimInvite(getStore(), token);
  if (!r.ok) {
    const html = PAGE(
      "Invitation",
      `<h1>Invitation impossible</h1><p>${r.erreur}</p><p>Demande un nouveau lien à Mathieu.</p>`,
    );
    return new Response(html, { status: 410, headers: ENTETES });
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

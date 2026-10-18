import { json } from "@/lib/http";
import { getStore } from "@/lib/store";

/** Appelée chaque semaine par Vercel (voir vercel.json) pour que la base gratuite ne s'endorme pas. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return json({ erreur: "Non autorisé." }, 401);
  }
  await getStore().ping();
  return json({ ok: true });
}

import { json, viewerFromRequest } from "@/lib/http";
import { getStore } from "@/lib/store";

/** Retire un de SES appareils. On peut retirer celui qu'on utilise : on est alors déconnecté. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const store = getStore();
  const viewer = await viewerFromRequest(request, store);
  if (viewer.role === "visitor" || !viewer.profileId) {
    return json({ erreur: "Cet appareil n'est pas reconnu." }, 403);
  }
  const appareil = (await store.listDevices()).find(
    (d) => d.id === id && d.profileId === viewer.profileId && d.revokedAt === null,
  );
  if (!appareil) return json({ erreur: "Appareil introuvable." }, 404);
  await store.revokeDevice(appareil.id, new Date().toISOString());
  return json({ ok: true, courant: appareil.id === viewer.deviceId });
}

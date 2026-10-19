import { requireDevice } from "@/lib/compte-api";
import { json } from "@/lib/http";

/** Retire un de SES appareils. On peut retirer celui qu'on utilise : on est alors déconnecté. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const acces = await requireDevice(request, "Cet appareil n'est pas reconnu.");
  if (!acces.ok) return acces.res;
  const { store, viewer } = acces;
  const appareil = (await store.listDevices()).find(
    (d) => d.id === id && d.profileId === viewer.profileId && d.revokedAt === null,
  );
  if (!appareil) return json({ erreur: "Appareil introuvable." }, 404);
  await store.revokeDevice(appareil.id, new Date().toISOString());
  return json({ ok: true, courant: appareil.id === viewer.deviceId });
}

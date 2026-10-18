import { createAccessToken } from "@/lib/auth";
import { requireDevice } from "@/lib/compte-api";
import { json } from "@/lib/http";

export const MAX_JETONS_ACTIFS = 5;

/**
 * Crée un jeton d'accès à donner à Claude. Il est renvoyé UNE SEULE FOIS : on ne garde que son empreinte,
 * impossible de le réafficher plus tard (on en crée un autre et on retire l'ancien).
 */
export async function POST(request: Request) {
  const acces = await requireDevice(request, "Cet appareil n'est pas reconnu : demande d'abord un lien d'invitation.");
  if (!acces.ok) return acces.res;
  const { store, viewer } = acces;

  const actifs = (await store.listDevices()).filter(
    (d) => d.profileId === viewer.profileId && d.kind === "jeton" && d.revokedAt === null,
  );
  if (actifs.length >= MAX_JETONS_ACTIFS) {
    return json({ erreur: `Tu as déjà ${MAX_JETONS_ACTIFS} jetons actifs : retires-en un avant d'en créer un autre.` }, 409);
  }

  const corps = (await request.json().catch(() => ({}))) as { label?: unknown };
  const label = typeof corps.label === "string" && corps.label.trim() ? corps.label.trim().slice(0, 60) : "Claude";
  const { token, device } = await createAccessToken(store, viewer.profileId, label);
  return json({ jeton: token, id: device.id });
}

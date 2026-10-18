import { createInviteLink } from "@/lib/auth";
import { requireDevice } from "@/lib/compte-api";
import { json, originOf } from "@/lib/http";

/** Un lien d'invitation pour un appareil de plus sur SON PROPRE compte (membre ou admin). */
export async function POST(request: Request) {
  const acces = await requireDevice(request, "Cet appareil n'est pas reconnu : demande d'abord un lien d'invitation.");
  if (!acces.ok) return acces.res;
  const corps = (await request.json().catch(() => ({}))) as { label?: unknown };
  const label = typeof corps.label === "string" && corps.label.trim() ? corps.label.trim().slice(0, 60) : "Nouvel appareil";
  // L'adresse où la personne est connectée : le cookie du nouvel appareil doit se poser sur le même site.
  const origine = originOf(request);
  return json({ lien: await createInviteLink(acces.store, acces.viewer.profileId, label, origine) });
}

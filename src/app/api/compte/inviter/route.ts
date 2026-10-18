import { createInviteLink } from "@/lib/auth";
import { json, originOf, viewerFromRequest } from "@/lib/http";
import { getStore } from "@/lib/store";

/** Un lien d'invitation pour un appareil de plus sur SON PROPRE compte (membre ou admin). */
export async function POST(request: Request) {
  const store = getStore();
  const viewer = await viewerFromRequest(request, store);
  if (viewer.role === "visitor" || !viewer.profileId) {
    return json({ erreur: "Cet appareil n'est pas reconnu : demande d'abord un lien d'invitation." }, 403);
  }
  const corps = (await request.json().catch(() => ({}))) as { label?: unknown };
  const label = typeof corps.label === "string" && corps.label.trim() ? corps.label.trim().slice(0, 60) : "Nouvel appareil";
  const origine = process.env.SITE_URL?.replace(/\/+$/, "") || originOf(request);
  return json({ lien: await createInviteLink(store, viewer.profileId, label, origine) });
}

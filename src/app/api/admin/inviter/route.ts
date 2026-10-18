import { requireAdmin } from "@/lib/admin-api";
import { createInviteLink } from "@/lib/auth";
import { json, originOf } from "@/lib/http";

const NOM_MAX = 60;

/** `{ nom }` : nouvelle personne (membre). `{ profilId, label? }` : un autre appareil pour une personne existante. */
export async function POST(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.res;

  const corps = (await request.json().catch(() => ({}))) as { nom?: unknown; profilId?: unknown; label?: unknown };
  const label = typeof corps.label === "string" && corps.label.trim() ? corps.label.trim().slice(0, 60) : null;

  let profilId: string;
  if (typeof corps.profilId === "string") {
    const profil = await admin.store.getProfile(corps.profilId);
    if (!profil) return json({ erreur: "Personne introuvable." }, 404);
    profilId = profil.id;
  } else {
    const nom = typeof corps.nom === "string" ? corps.nom.trim() : "";
    if (!nom) return json({ erreur: "Il faut un prénom." }, 400);
    if (nom.length > NOM_MAX) return json({ erreur: `Le prénom est trop long (${NOM_MAX} caractères maximum).` }, 400);
    profilId = (await admin.store.createProfile(nom, "member")).id;
  }

  const origine = process.env.SITE_URL?.replace(/\/+$/, "") || originOf(request);
  const lien = await createInviteLink(
    admin.store,
    profilId,
    label ?? (typeof corps.profilId === "string" ? "Nouvel appareil" : "Premier appareil"),
    origine,
  );
  return json({ lien, profilId });
}

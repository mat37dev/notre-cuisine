import type { Viewer } from "./auth";
import { json, viewerFromRequest } from "./http";
import { getStore } from "./store";
import type { Store } from "./store/types";

/** Pour les routes d'administration : continue seulement si l'appelant est l'admin, sinon renvoie un 403. */
export async function requireAdmin(
  request: Request,
): Promise<{ ok: true; store: Store; viewer: Viewer } | { ok: false; res: Response }> {
  const store = getStore();
  const viewer = await viewerFromRequest(request, store);
  if (viewer.role !== "admin") return { ok: false, res: json({ erreur: "Réservé à l'administrateur." }, 403) };
  return { ok: true, store, viewer };
}

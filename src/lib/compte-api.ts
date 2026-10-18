import type { Viewer } from "./auth";
import { json, refusJeton, viewerFromRequest } from "./http";
import { getStore } from "./store";
import type { Store } from "./store/types";

/**
 * Pour les routes de « Mon compte » : continue seulement si l'appelant est un appareil reconnu (membre ou admin).
 * Un jeton d'accès (Claude) est refusé : il peut publier des recettes, mais pas créer d'autres accès.
 */
export async function requireDevice(
  request: Request,
  messageInconnu: string,
): Promise<{ ok: true; store: Store; viewer: Viewer & { profileId: string } } | { ok: false; res: Response }> {
  const store = getStore();
  const viewer = await viewerFromRequest(request, store);
  const refus = refusJeton(viewer);
  if (refus) return { ok: false, res: refus };
  if (viewer.jeton) {
    return {
      ok: false,
      res: json({ erreur: "Un jeton ne peut pas créer d'autres accès : fais-le depuis un appareil reconnu." }, 403),
    };
  }
  if (viewer.role === "visitor" || !viewer.profileId) return { ok: false, res: json({ erreur: messageInconnu }, 403) };
  return { ok: true, store, viewer: { ...viewer, profileId: viewer.profileId } };
}

import type { Viewer } from "./auth";
import { json, viewerFromRequest } from "./http";
import { getStore } from "./store";
import type { Store } from "./store/types";

/** Pour les routes de « Mon compte » : continue seulement si l'appelant est un appareil reconnu (membre ou admin). */
export async function requireDevice(
  request: Request,
  messageInconnu: string,
): Promise<{ ok: true; store: Store; viewer: Viewer & { profileId: string } } | { ok: false; res: Response }> {
  const store = getStore();
  const viewer = await viewerFromRequest(request, store);
  if (viewer.role === "visitor" || !viewer.profileId) return { ok: false, res: json({ erreur: messageInconnu }, 403) };
  return { ok: true, store, viewer: { ...viewer, profileId: viewer.profileId } };
}

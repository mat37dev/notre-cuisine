import { cookies } from "next/headers";
import { DEVICE_COOKIE, getViewer, type Viewer } from "./auth";
import { getStore } from "./store";

/** Qui regarde la page : admin, membre (appareil reconnu) ou visiteur. */
export async function getCurrentViewer(): Promise<Viewer> {
  const jar = await cookies();
  return getViewer(getStore(), jar.get(DEVICE_COOKIE)?.value);
}

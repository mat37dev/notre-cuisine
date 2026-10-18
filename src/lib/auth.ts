import { createHash, randomBytes } from "node:crypto";
import type { Store } from "./store/types";

export const DEVICE_COOKIE = "nc_device";
/** 400 jours, le maximum que Chrome accepte pour un cookie. */
export const DEVICE_COOKIE_MAX_AGE = 400 * 24 * 3600;
const INVITE_VALIDITY_MS = 7 * 24 * 3600 * 1000;
const TOUCH_EVERY_MS = 3600 * 1000;

export type Viewer = {
  role: "admin" | "member" | "visitor";
  profileId: string | null;
  name: string | null;
  deviceId: string | null;
};

export const VISITOR: Viewer = { role: "visitor", profileId: null, name: null, deviceId: null };

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

const iso = (ms: number) => new Date(ms).toISOString();

/** Crée une invitation valable 7 jours et renvoie le lien à ouvrir sur l'appareil à reconnaître. */
export async function createInviteLink(
  store: Store,
  profileId: string,
  label: string,
  origin: string,
  now: () => number = Date.now,
): Promise<string> {
  const token = newToken();
  await store.createInvite(profileId, label, hashToken(token), iso(now() + INVITE_VALIDITY_MS));
  return `${origin.replace(/\/+$/, "")}/invite/${token}`;
}

const ERREURS = {
  invalide: "Invitation introuvable.",
  expiree: "Cette invitation a expiré.",
  utilisee: "Cette invitation a déjà été utilisée.",
} as const;

export async function claimInvite(
  store: Store,
  token: string,
  now: () => number = Date.now,
): Promise<{ ok: true; deviceToken: string } | { ok: false; erreur: string }> {
  const deviceToken = newToken();
  const r = await store.claimInvite(hashToken(token), hashToken(deviceToken), iso(now()));
  return r.status === "ok" ? { ok: true, deviceToken } : { ok: false, erreur: ERREURS[r.status] };
}

export async function getViewer(
  store: Store,
  deviceToken: string | undefined,
  now: () => number = Date.now,
): Promise<Viewer> {
  if (!deviceToken) return VISITOR;
  const found = await store.findDevice(hashToken(deviceToken));
  if (!found) return VISITOR;
  if (now() - Date.parse(found.device.lastSeenAt) >= TOUCH_EVERY_MS) {
    await store.touchDevice(found.device.id, iso(now()));
  }
  return {
    role: found.profile.role,
    profileId: found.profile.id,
    name: found.profile.name,
    deviceId: found.device.id,
  };
}

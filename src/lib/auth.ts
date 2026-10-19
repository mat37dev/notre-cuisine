import { createHash, randomBytes } from "node:crypto";
import type { Device, Store } from "./store/types";

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
  /** Vrai si l'appelant s'est identifié avec un jeton d'accès (Claude) plutôt qu'avec un appareil reconnu. */
  jeton?: boolean;
  /** Vrai si un jeton a été présenté mais qu'il est inconnu ou retiré : l'appelant doit en être averti. */
  jetonInvalide?: boolean;
};

export const VISITOR: Viewer = { role: "visitor", profileId: null, name: null, deviceId: null };

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Préfixe des jetons d'accès : on les reconnaît d'un coup d'œil (et les outils qui cherchent des secrets aussi). */
export const TOKEN_PREFIX = "nc_";

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
  if (!found || found.device.kind === "jeton") return VISITOR;
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

/** Crée un jeton d'accès pour ce profil. Le jeton n'est visible qu'ici : on ne garde que son empreinte. */
export async function createAccessToken(
  store: Store,
  profileId: string,
  label: string,
  now: () => number = Date.now,
): Promise<{ token: string; device: Device }> {
  const token = `${TOKEN_PREFIX}${newToken()}`;
  const device = await store.createToken(profileId, label, hashToken(token), iso(now()));
  return { token, device };
}

/**
 * Identifie l'appelant par son jeton d'accès. Un jeton ne donne jamais plus que les droits d'un membre :
 * même celui d'un administrateur ne peut ni valider, ni inviter, ni exporter.
 */
export async function getTokenViewer(
  store: Store,
  token: string,
  now: () => number = Date.now,
): Promise<Viewer | null> {
  const found = await store.findDevice(hashToken(token));
  if (!found || found.device.kind !== "jeton") return null;
  if (now() - Date.parse(found.device.lastSeenAt) >= TOUCH_EVERY_MS) {
    await store.touchDevice(found.device.id, iso(now()));
  }
  return {
    role: "member",
    profileId: found.profile.id,
    name: found.profile.name,
    deviceId: found.device.id,
    jeton: true,
  };
}

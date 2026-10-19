import { beforeEach, describe, expect, test } from "vitest";
import { claimInvite, createAccessToken, createInviteLink, getTokenViewer, getViewer, hashToken, newToken, VISITOR } from "./auth";
import { MemoryStore } from "./store/memory";

const T = Date.parse("2026-10-18T10:00:00.000Z");
const JOUR = 24 * 3600 * 1000;
const tokenDuLien = (lien: string) => lien.split("/invite/")[1];

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
});

describe("jetons", () => {
  test("hashToken est stable et ne contient pas le jeton", () => {
    expect(hashToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(hashToken("abc")).not.toContain("abc");
  });

  test("newToken : 43 caractères sûrs pour une adresse, différents à chaque appel", () => {
    const a = newToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newToken()).not.toBe(a);
  });
});

describe("invitation puis appareil reconnu", () => {
  test("le lien contient l'origine (sans double barre) et un jeton", async () => {
    const p = await store.createProfile("Camille", "member");
    const lien = await createInviteLink(store, p.id, "Téléphone", "https://x.test/", () => T);
    expect(lien).toMatch(/^https:\/\/x\.test\/invite\/[A-Za-z0-9_-]{43}$/);
  });

  test("invitation réclamée : l'appareil est reconnu comme membre", async () => {
    const p = await store.createProfile("Camille", "member");
    const lien = await createInviteLink(store, p.id, "Téléphone", "https://x.test", () => T);
    const r = await claimInvite(store, tokenDuLien(lien), () => T);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const viewer = await getViewer(store, r.deviceToken, () => T);
    expect(viewer).toMatchObject({ role: "member", name: "Camille", profileId: p.id });
    expect(viewer.deviceId).not.toBeNull();
  });

  test("profil admin : rôle admin", async () => {
    const p = await store.createProfile("Mathieu", "admin");
    const lien = await createInviteLink(store, p.id, "PC", "https://x.test", () => T);
    const r = await claimInvite(store, tokenDuLien(lien), () => T);
    if (!r.ok) throw new Error(r.erreur);
    expect((await getViewer(store, r.deviceToken, () => T)).role).toBe("admin");
  });

  test("invitation déjà utilisée", async () => {
    const p = await store.createProfile("Camille", "member");
    const token = tokenDuLien(await createInviteLink(store, p.id, "Téléphone", "https://x.test", () => T));
    await claimInvite(store, token, () => T);
    expect(await claimInvite(store, token, () => T)).toEqual({
      ok: false,
      erreur: "Cette invitation a déjà été utilisée.",
    });
  });

  test("invitation vieille de 8 jours : expirée", async () => {
    const p = await store.createProfile("Camille", "member");
    const token = tokenDuLien(await createInviteLink(store, p.id, "Téléphone", "https://x.test", () => T));
    expect(await claimInvite(store, token, () => T + 8 * JOUR)).toEqual({
      ok: false,
      erreur: "Cette invitation a expiré.",
    });
  });

  test("invitation valable encore 6 jours", async () => {
    const p = await store.createProfile("Camille", "member");
    const token = tokenDuLien(await createInviteLink(store, p.id, "Téléphone", "https://x.test", () => T));
    expect((await claimInvite(store, token, () => T + 6 * JOUR)).ok).toBe(true);
  });

  test("jeton inconnu", async () => {
    expect(await claimInvite(store, "n-importe-quoi", () => T)).toEqual({
      ok: false,
      erreur: "Invitation introuvable.",
    });
  });
});

describe("getViewer", () => {
  test("sans jeton : visiteur", async () => {
    expect(await getViewer(store, undefined, () => T)).toEqual({
      role: "visitor",
      profileId: null,
      name: null,
      deviceId: null,
    });
  });

  test("jeton inconnu : visiteur", async () => {
    expect((await getViewer(store, "inconnu", () => T)).role).toBe("visitor");
  });

  test("appareil retiré : visiteur", async () => {
    const p = await store.createProfile("Camille", "member");
    const token = tokenDuLien(await createInviteLink(store, p.id, "Téléphone", "https://x.test", () => T));
    const r = await claimInvite(store, token, () => T);
    if (!r.ok) throw new Error(r.erreur);
    const viewer = await getViewer(store, r.deviceToken, () => T);
    await store.revokeDevice(viewer.deviceId!, new Date(T).toISOString());
    expect((await getViewer(store, r.deviceToken, () => T)).role).toBe("visitor");
  });

  test("met à jour « vu pour la dernière fois » au plus une fois par heure", async () => {
    const p = await store.createProfile("Camille", "member");
    const token = tokenDuLien(await createInviteLink(store, p.id, "Téléphone", "https://x.test", () => T));
    const r = await claimInvite(store, token, () => T);
    if (!r.ok) throw new Error(r.erreur);

    await getViewer(store, r.deviceToken, () => T + 10 * 60_000);
    expect((await store.listDevices())[0].lastSeenAt).toBe(new Date(T).toISOString());

    await getViewer(store, r.deviceToken, () => T + 2 * 3600_000);
    expect((await store.listDevices())[0].lastSeenAt).toBe(new Date(T + 2 * 3600_000).toISOString());
  });
});

describe("jeton d'accès pour Claude", () => {
  test("createAccessToken : un jeton « nc_… » rendu une seule fois, seule son empreinte est gardée", async () => {
    const p = await store.createProfile("Camille", "member");
    const { token, device } = await createAccessToken(store, p.id, "Claude", () => T);
    expect(token).toMatch(/^nc_[A-Za-z0-9_-]{43}$/);
    expect(device).toMatchObject({ kind: "jeton", label: "Claude", profileId: p.id });
    expect(JSON.stringify(await store.listDevices())).not.toContain(token);
    expect((await store.findDevice(hashToken(token)))?.device.id).toBe(device.id);
  });

  test("getTokenViewer : le jeton d'un membre donne un membre, marqué « jeton »", async () => {
    const p = await store.createProfile("Camille", "member");
    const { token } = await createAccessToken(store, p.id, "Claude", () => T);
    expect(await getTokenViewer(store, token, () => T)).toMatchObject({
      role: "member",
      profileId: p.id,
      name: "Camille",
      jeton: true,
    });
  });

  test("getTokenViewer : le jeton d'un admin n'a PAS les droits d'admin (il publie, il ne gère pas)", async () => {
    const admin = await store.createProfile("Mathieu", "admin");
    const { token } = await createAccessToken(store, admin.id, "Claude", () => T);
    expect(await getTokenViewer(store, token, () => T)).toMatchObject({ role: "member", profileId: admin.id });
  });

  test("getTokenViewer : jeton inconnu, retiré, ou cookie d'appareil présenté comme jeton : null", async () => {
    const p = await store.createProfile("Camille", "member");
    const { token, device } = await createAccessToken(store, p.id, "Claude", () => T);
    expect(await getTokenViewer(store, "nc_inconnu", () => T)).toBeNull();

    const lien = await createInviteLink(store, p.id, "Téléphone", "https://x.test", () => T);
    const r = await claimInvite(store, tokenDuLien(lien), () => T);
    if (!r.ok) throw new Error(r.erreur);
    expect(await getTokenViewer(store, r.deviceToken, () => T)).toBeNull();

    await store.revokeDevice(device.id, new Date(T).toISOString());
    expect(await getTokenViewer(store, token, () => T)).toBeNull();
  });

  test("un jeton d'accès ne marche pas comme cookie d'appareil", async () => {
    const p = await store.createProfile("Camille", "member");
    const { token } = await createAccessToken(store, p.id, "Claude", () => T);
    expect(await getViewer(store, token, () => T)).toEqual(VISITOR);
  });

  test("l'utilisation d'un jeton met à jour sa date de dernière utilisation (au plus une fois par heure)", async () => {
    const p = await store.createProfile("Camille", "member");
    const { token, device } = await createAccessToken(store, p.id, "Claude", () => T);
    await getTokenViewer(store, token, () => T + 2 * 3600 * 1000);
    const vu = (await store.listDevices()).find((d) => d.id === device.id)!.lastSeenAt;
    expect(vu).toBe(new Date(T + 2 * 3600 * 1000).toISOString());
  });
});

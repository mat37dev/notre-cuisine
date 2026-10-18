// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { claimInvite, createInviteLink, DEVICE_COOKIE, getViewer } from "@/lib/auth";
import { setStoreForTests } from "@/lib/store";
import { MemoryStore } from "@/lib/store/memory";
import type { Profile } from "@/lib/store/types";
import { POST as retirer } from "./appareils/[id]/retirer/route";
import { POST as inviter } from "./inviter/route";

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
  setStoreForTests(store);
});
afterEach(() => setStoreForTests(null));

type Personne = { profil: Profile; cookie: string; deviceToken: string; deviceId: string };
async function personne(nom: string, role: "admin" | "member", label = "Téléphone"): Promise<Personne> {
  const profil = await store.createProfile(nom, role);
  return ajouterAppareil(profil, label);
}
async function ajouterAppareil(profil: Profile, label: string): Promise<Personne> {
  const lien = await createInviteLink(store, profil.id, label, "https://x.test");
  const r = await claimInvite(store, lien.split("/invite/")[1]);
  if (!r.ok) throw new Error(r.erreur);
  const viewer = await getViewer(store, r.deviceToken);
  return { profil, cookie: `${DEVICE_COOKIE}=${r.deviceToken}`, deviceToken: r.deviceToken, deviceId: viewer.deviceId! };
}

const requete = (cookie?: string, corps?: unknown) =>
  new Request("https://x.test/api/compte/x", {
    method: "POST",
    headers: { ...(cookie ? { cookie } : {}), "content-type": "application/json" },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
const avecId = (id: string) => ({ params: Promise.resolve({ id }) });

describe("POST /api/compte/inviter : un appareil de plus pour son propre compte", () => {
  test("un visiteur : 403", async () => {
    expect((await inviter(requete(undefined, {}))).status).toBe(403);
  });

  test("un membre obtient un lien ; l'ouvrir reconnaît un nouvel appareil du MÊME compte", async () => {
    const camille = await personne("Camille", "member");
    const res = await inviter(requete(camille.cookie, { label: "Mon PC" }));
    expect(res.status).toBe(200);
    const { lien } = await res.json();
    expect(lien).toMatch(/^https:\/\/x\.test\/invite\/[A-Za-z0-9_-]{43}$/);
    const r = await claimInvite(store, lien.split("/invite/")[1]);
    if (!r.ok) throw new Error(r.erreur);
    expect(await getViewer(store, r.deviceToken)).toMatchObject({ name: "Camille", role: "member", profileId: camille.profil.id });
    expect((await store.listProfiles()).filter((p) => p.name === "Camille")).toHaveLength(1);
    const appareils = (await store.listDevices()).filter((d) => d.profileId === camille.profil.id);
    expect(appareils.map((d) => d.label).sort()).toEqual(["Mon PC", "Téléphone"]);
  });

  test("sans nom d'appareil : « Nouvel appareil » ; nom trop long : coupé à 60 caractères", async () => {
    const camille = await personne("Camille", "member");
    const a = await (await inviter(requete(camille.cookie, {}))).json();
    await claimInvite(store, a.lien.split("/invite/")[1]);
    const b = await (await inviter(requete(camille.cookie, { label: "x".repeat(100) }))).json();
    await claimInvite(store, b.lien.split("/invite/")[1]);
    const labels = (await store.listDevices()).map((d) => d.label);
    expect(labels).toContain("Nouvel appareil");
    expect(labels).toContain("x".repeat(60));
  });

  test("l'admin aussi, pour son propre compte", async () => {
    const admin = await personne("Mathieu", "admin");
    const { lien } = await (await inviter(requete(admin.cookie, { label: "PC" }))).json();
    const r = await claimInvite(store, lien.split("/invite/")[1]);
    if (!r.ok) throw new Error(r.erreur);
    expect(await getViewer(store, r.deviceToken)).toMatchObject({ role: "admin", name: "Mathieu" });
  });

  test("un appareil déjà retiré ne peut plus rien créer (redevenu visiteur)", async () => {
    const camille = await personne("Camille", "member");
    await store.revokeDevice(camille.deviceId, new Date().toISOString());
    expect((await inviter(requete(camille.cookie, {}))).status).toBe(403);
  });
});

describe("POST /api/compte/appareils/[id]/retirer : retirer un de ses appareils", () => {
  test("un visiteur : 403", async () => {
    expect((await retirer(requete(), avecId("x"))).status).toBe(403);
  });

  test("le membre retire son autre appareil, qui redevient visiteur ; le sien continue de marcher", async () => {
    const camille = await personne("Camille", "member", "Téléphone");
    const pc = await ajouterAppareil(camille.profil, "PC");
    const res = await retirer(requete(camille.cookie), avecId(pc.deviceId));
    expect(res.status).toBe(200);
    expect((await getViewer(store, pc.deviceToken)).role).toBe("visitor");
    expect((await getViewer(store, camille.deviceToken)).role).toBe("member");
  });

  test("on ne retire pas l'appareil de quelqu'un d'autre : 404 et l'appareil reste reconnu", async () => {
    const camille = await personne("Camille", "member");
    const lea = await personne("Léa", "member");
    const res = await retirer(requete(camille.cookie), avecId(lea.deviceId));
    expect(res.status).toBe(404);
    expect((await getViewer(store, lea.deviceToken)).role).toBe("member");
  });

  test("retirer l'appareil qu'on utilise est permis (on est alors déconnecté)", async () => {
    const camille = await personne("Camille", "member");
    const res = await retirer(requete(camille.cookie), avecId(camille.deviceId));
    expect(res.status).toBe(200);
    expect((await res.json()).courant).toBe(true);
    expect((await getViewer(store, camille.deviceToken)).role).toBe("visitor");
  });

  test("appareil inconnu : 404", async () => {
    const camille = await personne("Camille", "member");
    expect((await retirer(requete(camille.cookie), avecId("00000000-0000-4000-8000-000000000000"))).status).toBe(404);
  });
});

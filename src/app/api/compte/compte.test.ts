// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { claimInvite, createInviteLink, DEVICE_COOKIE, getTokenViewer, getViewer } from "@/lib/auth";
import { setStoreForTests } from "@/lib/store";
import { MemoryStore } from "@/lib/store/memory";
import type { Profile } from "@/lib/store/types";
import { POST as retirer } from "./appareils/[id]/retirer/route";
import { POST as inviter } from "./inviter/route";
import { POST as creerJeton } from "./jeton/route";

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

  test("le lien suit l'adresse où la personne est connectée, même si SITE_URL en indique une autre", async () => {
    vi.stubEnv("SITE_URL", "https://ancienne-adresse.vercel.app");
    try {
      const camille = await personne("Camille", "member");
      const req = new Request("https://cuisine.exemple.fr/api/compte/inviter", {
        method: "POST",
        headers: { cookie: camille.cookie, "content-type": "application/json" },
        body: "{}",
      });
      const { lien } = await (await inviter(req)).json();
      expect(lien).toMatch(/^https:\/\/cuisine\.exemple\.fr\/invite\//);
    } finally {
      vi.unstubAllEnvs();
    }
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

describe("POST /api/compte/jeton : un jeton d'accès à donner à Claude", () => {
  test("un visiteur : 403", async () => {
    expect((await creerJeton(requete(undefined, {}))).status).toBe(403);
  });

  test("un membre reçoit un jeton « nc_… » qui l'identifie, et dont seule l'empreinte est enregistrée", async () => {
    const camille = await personne("Camille", "member");
    const res = await creerJeton(requete(camille.cookie, { label: "Claude du téléphone" }));
    expect(res.status).toBe(200);
    const { jeton, id } = await res.json();
    expect(jeton).toMatch(/^nc_[A-Za-z0-9_-]{43}$/);
    expect(await getTokenViewer(store, jeton)).toMatchObject({ name: "Camille", role: "member", jeton: true });
    const enregistre = (await store.listDevices()).find((d) => d.id === id);
    expect(enregistre).toMatchObject({ kind: "jeton", label: "Claude du téléphone", profileId: camille.profil.id });
    expect(JSON.stringify(await store.listDevices())).not.toContain(jeton);
  });

  test("sans nom : « Claude » ; nom trop long : coupé à 60 caractères", async () => {
    const camille = await personne("Camille", "member");
    await creerJeton(requete(camille.cookie, {}));
    await creerJeton(requete(camille.cookie, { label: "x".repeat(100) }));
    const labels = (await store.listDevices()).filter((d) => d.kind === "jeton").map((d) => d.label);
    expect(labels.sort()).toEqual(["Claude", "x".repeat(60)].sort());
  });

  test("au plus 5 jetons actifs par compte ; en retirer un en libère une place", async () => {
    const camille = await personne("Camille", "member");
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) ids.push((await (await creerJeton(requete(camille.cookie, {}))).json()).id);
    const sixieme = await creerJeton(requete(camille.cookie, {}));
    expect(sixieme.status).toBe(409);
    expect((await sixieme.json()).erreur).toMatch(/5 jetons/);

    await retirer(requete(camille.cookie), avecId(ids[0]));
    expect((await creerJeton(requete(camille.cookie, {}))).status).toBe(200);
  });

  test("le jeton d'un compte ne compte pas pour un autre", async () => {
    const camille = await personne("Camille", "member");
    const lea = await personne("Léa", "member");
    for (let i = 0; i < 5; i++) await creerJeton(requete(camille.cookie, {}));
    expect((await creerJeton(requete(lea.cookie, {}))).status).toBe(200);
  });

  test("retirer le jeton (même route que pour un appareil) : il cesse de fonctionner", async () => {
    const camille = await personne("Camille", "member");
    const { jeton, id } = await (await creerJeton(requete(camille.cookie, {}))).json();
    const res = await retirer(requete(camille.cookie), avecId(id));
    expect(res.status).toBe(200);
    expect((await res.json()).courant).toBe(false);
    expect(await getTokenViewer(store, jeton)).toBeNull();
  });

  test("un jeton ne peut pas fabriquer d'autres accès : ni jeton, ni lien d'invitation, ni retrait d'appareil : 403", async () => {
    const camille = await personne("Camille", "member");
    const { jeton } = await (await creerJeton(requete(camille.cookie, {}))).json();
    const entete = { authorization: `Bearer ${jeton}` };
    const avecJeton = () =>
      new Request("https://x.test/api/compte/x", {
        method: "POST",
        headers: { ...entete, "content-type": "application/json" },
        body: "{}",
      });
    expect((await creerJeton(avecJeton())).status).toBe(403);
    expect((await inviter(avecJeton())).status).toBe(403);
    expect((await retirer(avecJeton(), avecId(camille.deviceId))).status).toBe(403);
    expect((await getViewer(store, camille.deviceToken)).role).toBe("member");
  });

  test("un jeton inconnu : 401", async () => {
    const req = new Request("https://x.test/api/compte/jeton", {
      method: "POST",
      headers: { authorization: "Bearer nc_faux" },
    });
    expect((await creerJeton(req)).status).toBe(401);
  });

  test("le jeton de l'admin n'a que les droits d'un membre", async () => {
    const admin = await personne("Mathieu", "admin");
    const { jeton } = await (await creerJeton(requete(admin.cookie, {}))).json();
    expect(await getTokenViewer(store, jeton)).toMatchObject({ name: "Mathieu", role: "member" });
  });
});

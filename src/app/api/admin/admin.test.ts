// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { claimInvite, createInviteLink, DEVICE_COOKIE, getViewer } from "@/lib/auth";
import { uneRecette } from "@/lib/recipe/fixtures";
import { setStoreForTests } from "@/lib/store";
import { MemoryStore } from "@/lib/store/memory";
import type { Profile } from "@/lib/store/types";
import { POST as retirer } from "./appareils/[id]/retirer/route";
import { GET as exporter } from "./export/route";
import { POST as inviter } from "./inviter/route";
import { POST as refuser } from "./refuser/[id]/route";
import { POST as valider } from "./valider/[id]/route";

let store: MemoryStore;
let admin: { profil: Profile; cookie: string; deviceToken: string };
let membre: { profil: Profile; cookie: string; deviceToken: string };

async function personne(nom: string, role: "admin" | "member") {
  const profil = await store.createProfile(nom, role);
  const lien = await createInviteLink(store, profil.id, "Téléphone", "https://x.test");
  const r = await claimInvite(store, lien.split("/invite/")[1]);
  if (!r.ok) throw new Error(r.erreur);
  return { profil, cookie: `${DEVICE_COOKIE}=${r.deviceToken}`, deviceToken: r.deviceToken };
}

beforeEach(async () => {
  store = new MemoryStore();
  setStoreForTests(store);
  admin = await personne("Mathieu", "admin");
  membre = await personne("Camille", "member");
});
afterEach(() => setStoreForTests(null));

const req = (cookie?: string, body?: unknown) =>
  new Request("https://x.test/api/admin/x", {
    method: "POST",
    headers: { ...(cookie ? { cookie } : {}), "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const avecId = (id: string) => ({ params: Promise.resolve({ id }) });

describe("accès réservé à l'admin", () => {
  test.each([
    ["valider", (c?: string) => valider(req(c), avecId("x"))],
    ["refuser", (c?: string) => refuser(req(c), avecId("x"))],
    ["inviter", (c?: string) => inviter(req(c, { nom: "Léa" }))],
    ["retirer", (c?: string) => retirer(req(c), avecId("x"))],
    ["exporter", (c?: string) => exporter(new Request("https://x.test/api/admin/export", { headers: c ? { cookie: c } : {} }))],
  ])("%s : 403 pour un visiteur et pour un membre", async (_nom, appel) => {
    expect((await appel()).status).toBe(403);
    expect((await appel(membre.cookie)).status).toBe(403);
  });
});

describe("valider et refuser", () => {
  test("valider fait passer une recette en attente en publiée", async () => {
    const row = await store.insertRecipe({ status: "pending", authorId: null, recipe: uneRecette() });
    const res = await valider(req(admin.cookie), avecId(row.id));
    expect(res.status).toBe(200);
    expect((await store.getRecipe(row.id))?.status).toBe("published");
  });

  test("valider un id inconnu : 404", async () => {
    const res = await valider(req(admin.cookie), avecId("00000000-0000-4000-8000-000000000000"));
    expect(res.status).toBe(404);
  });

  test("refuser supprime la recette", async () => {
    const row = await store.insertRecipe({ status: "pending", authorId: null, recipe: uneRecette() });
    const res = await refuser(req(admin.cookie), avecId(row.id));
    expect(res.status).toBe(200);
    expect(await store.getRecipe(row.id)).toBeNull();
  });
});

describe("inviter", () => {
  test("une nouvelle personne : crée un profil membre et un lien qui fonctionne", async () => {
    const res = await inviter(req(admin.cookie, { nom: "  Léa  " }));
    expect(res.status).toBe(200);
    const { lien, profilId } = await res.json();
    expect(lien).toMatch(/^https:\/\/x\.test\/invite\/[A-Za-z0-9_-]{43}$/);
    expect(await store.getProfile(profilId)).toMatchObject({ name: "Léa", role: "member" });
    const r = await claimInvite(store, lien.split("/invite/")[1]);
    expect(r.ok).toBe(true);
    if (r.ok) expect((await getViewer(store, r.deviceToken)).name).toBe("Léa");
  });

  test("un autre appareil pour une personne existante", async () => {
    const res = await inviter(req(admin.cookie, { profilId: membre.profil.id, label: "PC" }));
    expect(res.status).toBe(200);
    const { lien } = await res.json();
    const r = await claimInvite(store, lien.split("/invite/")[1]);
    if (!r.ok) throw new Error(r.erreur);
    expect(await getViewer(store, r.deviceToken)).toMatchObject({ name: "Camille", role: "member" });
    expect((await store.listProfiles()).filter((p) => p.name === "Camille")).toHaveLength(1);
  });

  test("ni nom ni personne : 400 ; personne inconnue : 404 ; nom trop long : 400", async () => {
    expect((await inviter(req(admin.cookie, {}))).status).toBe(400);
    expect((await inviter(req(admin.cookie, { nom: "   " }))).status).toBe(400);
    expect((await inviter(req(admin.cookie, { nom: "x".repeat(61) }))).status).toBe(400);
    expect((await inviter(req(admin.cookie, { profilId: "00000000-0000-4000-8000-000000000000" }))).status).toBe(404);
  });
});

describe("retirer un appareil", () => {
  test("l'appareil retiré redevient visiteur", async () => {
    const viewer = await getViewer(store, membre.deviceToken);
    const res = await retirer(req(admin.cookie), avecId(viewer.deviceId!));
    expect(res.status).toBe(200);
    expect((await getViewer(store, membre.deviceToken)).role).toBe("visitor");
  });
});

describe("exporter", () => {
  test("toutes les recettes, en attente comprises, à télécharger", async () => {
    await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette({ titre: "A" }) });
    await store.insertRecipe({ status: "pending", authorId: null, recipe: uneRecette({ titre: "B" }) });
    const res = await exporter(new Request("https://x.test/api/admin/export", { headers: { cookie: admin.cookie } }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toMatch(/^attachment; filename="recettes-\d{4}-\d{2}-\d{2}\.json"$/);
    const rows = await res.json();
    expect(rows.map((r: { recipe: { titre: string } }) => r.recipe.titre).sort()).toEqual(["A", "B"]);
    expect(rows.map((r: { status: string }) => r.status).sort()).toEqual(["pending", "published"]);
  });
});

describe("POST /api/admin/inviter : le lien suit l'adresse où l'admin est connecté", () => {
  test("même si SITE_URL en indique une autre", async () => {
    vi.stubEnv("SITE_URL", "https://ancienne-adresse.vercel.app");
    try {
      const req = new Request("https://cuisine.exemple.fr/api/admin/inviter", {
        method: "POST",
        headers: { cookie: admin.cookie, "content-type": "application/json" },
        body: JSON.stringify({ nom: "Léa" }),
      });
      const { lien } = await (await inviter(req)).json();
      expect(lien).toMatch(/^https:\/\/cuisine\.exemple\.fr\/invite\//);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

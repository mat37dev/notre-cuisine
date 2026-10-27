// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { claimInvite, createInviteLink, DEVICE_COOKIE } from "@/lib/auth";
import { uneRecette } from "@/lib/recipe/fixtures";
import { setStoreForTests } from "@/lib/store";
import { MemoryStore } from "@/lib/store/memory";
import { DELETE } from "./route";

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
  setStoreForTests(store);
});
afterEach(() => setStoreForTests(null));

async function personne(nom: string, role: "admin" | "member") {
  const profil = await store.createProfile(nom, role);
  const lien = await createInviteLink(store, profil.id, "Téléphone", "https://x.test");
  const r = await claimInvite(store, lien.split("/invite/")[1]);
  if (!r.ok) throw new Error(r.erreur);
  return { profil, cookie: `${DEVICE_COOKIE}=${r.deviceToken}` };
}
const appeler = (id: string, cookie?: string) =>
  DELETE(new Request(`https://x.test/api/recettes/${id}`, { method: "DELETE", headers: cookie ? { cookie } : {} }), {
    params: Promise.resolve({ id }),
  });

describe("DELETE /api/recettes/[id]", () => {
  test("un visiteur : 403", async () => {
    const row = await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette() });
    expect((await appeler(row.id)).status).toBe(403);
    expect(await store.getRecipe(row.id)).not.toBeNull();
  });

  test("un membre connecté supprime sa recette, et aussi celle d'un autre", async () => {
    const camille = await personne("Camille", "member");
    const lea = await personne("Léa", "member");
    const a = await store.insertRecipe({ status: "published", authorId: camille.profil.id, recipe: uneRecette() });
    const b = await store.insertRecipe({ status: "published", authorId: camille.profil.id, recipe: uneRecette() });
    expect((await appeler(a.id, camille.cookie)).status).toBe(200);
    expect(await store.getRecipe(a.id)).toBeNull();
    expect((await appeler(b.id, lea.cookie)).status).toBe(200);
    expect(await store.getRecipe(b.id)).toBeNull();
  });

  test("l'admin supprime tout ; recette inconnue : 404", async () => {
    const admin = await personne("Mathieu", "admin");
    const row = await store.insertRecipe({ status: "pending", authorId: null, recipe: uneRecette() });
    expect((await appeler(row.id, admin.cookie)).status).toBe(200);
    expect((await appeler(row.id, admin.cookie)).status).toBe(404);
  });
});

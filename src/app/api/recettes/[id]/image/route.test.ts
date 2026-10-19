// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { claimInvite, createInviteLink, DEVICE_COOKIE } from "@/lib/auth";
import { MAX_IMAGE_BYTES } from "@/lib/image";
import { uneRecette } from "@/lib/recipe/fixtures";
import { setStoreForTests } from "@/lib/store";
import { MemoryStore } from "@/lib/store/memory";
import { DELETE, POST, PUT } from "./route";

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

const jpeg = (taille = 64) => {
  const o = new Uint8Array(taille);
  o.set([0xff, 0xd8, 0xff, 0xe0]);
  return o;
};
const envoyer = (
  id: string,
  cookie?: string,
  fichier?: Uint8Array | null,
  type = "image/jpeg",
  entetes: Record<string, string> = {},
) => {
  const fd = new FormData();
  if (fichier) fd.set("image", new Blob([fichier as BlobPart], { type }), "photo.jpg");
  return POST(
    new Request(`https://x.test/api/recettes/${id}/image`, {
      method: "POST",
      headers: { ...(cookie ? { cookie } : {}), ...entetes },
      body: fd,
    }),
    { params: Promise.resolve({ id }) },
  );
};
const retirer = (id: string, cookie?: string) =>
  DELETE(
    new Request(`https://x.test/api/recettes/${id}/image`, { method: "DELETE", headers: cookie ? { cookie } : {} }),
    { params: Promise.resolve({ id }) },
  );

describe("POST /api/recettes/[id]/image", () => {
  test("l'auteur ajoute une photo : l'adresse est gardée dans la recette", async () => {
    const camille = await personne("Camille", "member");
    const row = await store.insertRecipe({ status: "published", authorId: camille.profil.id, recipe: uneRecette() });
    const res = await envoyer(row.id, camille.cookie, jpeg());
    expect(res.status).toBe(200);
    const { image } = await res.json();
    expect(image).toEqual(expect.any(String));
    expect((await store.getRecipe(row.id))?.recipe.image).toBe(image);
  });

  test("l'admin peut en ajouter sur n'importe quelle recette", async () => {
    const admin = await personne("Mathieu", "admin");
    const row = await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette() });
    expect((await envoyer(row.id, admin.cookie, jpeg())).status).toBe(200);
  });

  test("un visiteur ou un autre membre : 403 et rien n'est enregistré", async () => {
    const camille = await personne("Camille", "member");
    const lea = await personne("Léa", "member");
    const row = await store.insertRecipe({ status: "published", authorId: camille.profil.id, recipe: uneRecette() });
    expect((await envoyer(row.id, undefined, jpeg())).status).toBe(403);
    expect((await envoyer(row.id, lea.cookie, jpeg())).status).toBe(403);
    expect((await store.getRecipe(row.id))?.recipe.image).toBeUndefined();
  });

  test("recette inconnue : 404 ; pas de fichier : 400", async () => {
    const admin = await personne("Mathieu", "admin");
    expect((await envoyer("00000000-0000-4000-8000-000000000000", admin.cookie, jpeg())).status).toBe(404);
    const row = await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette() });
    expect((await envoyer(row.id, admin.cookie, null)).status).toBe(400);
  });

  test("un SVG déguisé en JPEG est refusé (415) : on lit le contenu, pas le type annoncé", async () => {
    const admin = await personne("Mathieu", "admin");
    const row = await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette() });
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const res = await envoyer(row.id, admin.cookie, svg, "image/jpeg");
    expect(res.status).toBe(415);
    expect((await store.getRecipe(row.id))?.recipe.image).toBeUndefined();
  });

  test("fichier trop gros : 413", async () => {
    const admin = await personne("Mathieu", "admin");
    const row = await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette() });
    expect((await envoyer(row.id, admin.cookie, jpeg(MAX_IMAGE_BYTES + 1))).status).toBe(413);
  });

  test("taille annoncée énorme dans l'en-tête : 413 sans lire le corps", async () => {
    const admin = await personne("Mathieu", "admin");
    const row = await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette() });
    const res = await envoyer(row.id, admin.cookie, jpeg(), "image/jpeg", {
      "content-length": String(50 * MAX_IMAGE_BYTES),
    });
    expect(res.status).toBe(413);
  });
});

describe("DELETE /api/recettes/[id]/image", () => {
  test("l'auteur retire la photo", async () => {
    const camille = await personne("Camille", "member");
    const row = await store.insertRecipe({
      status: "published",
      authorId: camille.profil.id,
      recipe: uneRecette({ image: "https://exemple.test/a.jpg" }),
    });
    expect((await retirer(row.id, camille.cookie)).status).toBe(200);
    expect((await store.getRecipe(row.id))?.recipe.image).toBeUndefined();
  });

  test("visiteur ou autre membre : 403, la photo reste", async () => {
    const camille = await personne("Camille", "member");
    const lea = await personne("Léa", "member");
    const row = await store.insertRecipe({
      status: "published",
      authorId: camille.profil.id,
      recipe: uneRecette({ image: "https://exemple.test/a.jpg" }),
    });
    expect((await retirer(row.id)).status).toBe(403);
    expect((await retirer(row.id, lea.cookie)).status).toBe(403);
    expect((await store.getRecipe(row.id))?.recipe.image).toBe("https://exemple.test/a.jpg");
  });

  test("recette inconnue : 404", async () => {
    const admin = await personne("Mathieu", "admin");
    expect((await retirer("00000000-0000-4000-8000-000000000000", admin.cookie)).status).toBe(404);
  });
});

const definirAdresse = (id: string, cookie: string | undefined, corps: unknown) =>
  PUT(
    new Request(`https://x.test/api/recettes/${id}/image`, {
      method: "PUT",
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: typeof corps === "string" ? corps : JSON.stringify(corps),
    }),
    { params: Promise.resolve({ id }) },
  );

describe("PUT /api/recettes/[id]/image : changer la photo avec une simple adresse", () => {
  const ADRESSE = "https://upload.wikimedia.org/wikipedia/commons/a/ab/tarte.jpg";

  test("l'auteur donne une adresse https : elle devient l'image de la recette", async () => {
    const camille = await personne("Camille", "member");
    const row = await store.insertRecipe({ status: "published", authorId: camille.profil.id, recipe: uneRecette() });
    const res = await definirAdresse(row.id, camille.cookie, { url: ADRESSE });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ image: ADRESSE });
    expect((await store.getRecipe(row.id))?.recipe.image).toBe(ADRESSE);
  });

  test("elle remplace une photo envoyée depuis l'appareil, et le fichier stocké est supprimé", async () => {
    const admin = await personne("Mathieu", "admin");
    const row = await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette() });
    await envoyer(row.id, admin.cookie, jpeg());
    const suppression = vi.spyOn(store, "deleteImage");
    expect((await definirAdresse(row.id, admin.cookie, { url: ADRESSE })).status).toBe(200);
    expect(suppression).toHaveBeenCalledTimes(1);
    expect(suppression.mock.calls[0]).toEqual([row.id]);
    expect((await store.getRecipe(row.id))?.recipe.image).toBe(ADRESSE);
  });

  test("adresse invalide (http, texte, absente) : 400, l'image existante n'est pas touchée", async () => {
    const admin = await personne("Mathieu", "admin");
    const row = await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette({ image: ADRESSE }) });
    for (const corps of [{ url: "http://exemple.fr/a.jpg" }, { url: "une tarte" }, { url: 3 }, {}, "pas du json"]) {
      const res = await definirAdresse(row.id, admin.cookie, corps);
      expect(res.status, JSON.stringify(corps)).toBe(400);
      expect((await res.json()).erreur).toMatch(/https/);
    }
    expect((await store.getRecipe(row.id))?.recipe.image).toBe(ADRESSE);
  });

  test("un visiteur ou un autre membre : 403 ; recette inconnue : 404", async () => {
    const camille = await personne("Camille", "member");
    const lea = await personne("Léa", "member");
    const row = await store.insertRecipe({ status: "published", authorId: camille.profil.id, recipe: uneRecette() });
    expect((await definirAdresse(row.id, undefined, { url: ADRESSE })).status).toBe(403);
    expect((await definirAdresse(row.id, lea.cookie, { url: ADRESSE })).status).toBe(403);
    expect((await definirAdresse("00000000-0000-4000-8000-000000000000", camille.cookie, { url: ADRESSE })).status).toBe(404);
    expect((await store.getRecipe(row.id))?.recipe.image).toBeUndefined();
  });
});

// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { claimInvite, createAccessToken, createInviteLink, DEVICE_COOKIE } from "@/lib/auth";
import { uneRecette } from "@/lib/recipe/fixtures";
import { MAX_PAYLOAD_BYTES } from "@/lib/recipe/types";
import { setStoreForTests } from "@/lib/store";
import { MemoryStore } from "@/lib/store/memory";
import { GET as getOne } from "./[id]/route";
import { GET as getList, POST } from "./route";

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
  setStoreForTests(store);
});
afterEach(() => setStoreForTests(null));

const fence = (o: unknown) => "```json\n" + JSON.stringify(o) + "\n```";
const post = (texte: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request("https://x.test/api/recettes", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4", ...headers },
      body: JSON.stringify({ texte }),
    }),
  );

async function cookieMembre(): Promise<string> {
  const p = await store.createProfile("Camille", "member");
  const lien = await createInviteLink(store, p.id, "Téléphone", "https://x.test");
  const r = await claimInvite(store, lien.split("/invite/")[1]);
  if (!r.ok) throw new Error(r.erreur);
  return `${DEVICE_COOKIE}=${r.deviceToken}`;
}

describe("GET /api/recettes", () => {
  test("liste les recettes publiées seulement, avec les champs utiles", async () => {
    await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette({ titre: "Visible" }) });
    await store.insertRecipe({ status: "pending", authorId: null, recipe: uneRecette({ titre: "Cachée" }) });
    const res = await getList(new Request("https://x.test/api/recettes"));
    expect(res.status).toBe(200);
    const liste = await res.json();
    expect(liste).toHaveLength(1);
    expect(liste[0]).toMatchObject({ slug: "visible", titre: "Visible", categorie: "salade", description: "Une salade fraîche." });
    expect(liste[0].id).toEqual(expect.any(String));
  });

  test("?q= et ?categorie= filtrent", async () => {
    await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette({ titre: "Salade burrata" }) });
    await store.insertRecipe({
      status: "published",
      authorId: null,
      recipe: uneRecette({ titre: "Flan", categorie: "dessert", ingredients: [{ id: "lait", nom: "lait", quantite: 1, unite: "l" }] }),
    });
    const parQ = await (await getList(new Request("https://x.test/api/recettes?q=burrata"))).json();
    expect(parQ.map((r: { titre: string }) => r.titre)).toEqual(["Salade burrata"]);
    const parCat = await (await getList(new Request("https://x.test/api/recettes?categorie=dessert"))).json();
    expect(parCat.map((r: { titre: string }) => r.titre)).toEqual(["Flan"]);
  });

  test("une entrée par recette ; une variante donne son nom et le slug de sa référence", async () => {
    const a = await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette({ titre: "Lasagnes" }) });
    await store.insertRecipe({
      status: "published",
      authorId: null,
      recipe: uneRecette({ titre: "Lasagnes végé", nom_variante: "Végétarienne" }),
      varianteDe: a.id,
    });
    const liste = await (await getList(new Request("https://x.test/api/recettes"))).json();
    expect(liste).toHaveLength(2);
    expect(liste.find((r: { slug: string }) => r.slug === "lasagnes-vege")).toMatchObject({
      nom_variante: "Végétarienne",
      variante_de: "lasagnes",
    });
    const reference = liste.find((r: { slug: string }) => r.slug === "lasagnes");
    expect("variante_de" in reference).toBe(false);
    expect("nom_variante" in reference).toBe(false);
  });
});

describe("GET /api/recettes/[id]", () => {
  const appeler = (id: string) =>
    getOne(new Request(`https://x.test/api/recettes/${id}`), { params: Promise.resolve({ id }) });

  test("renvoie la recette complète par slug, avec son lien", async () => {
    const row = await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette() });
    const res = await appeler("salade-burrata");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ id: row.id, slug: "salade-burrata", titre: "Salade burrata", portions: 4 });
    expect(json.ingredients).toHaveLength(3);
    expect(json.lien).toBe("https://x.test/recettes/salade-burrata");
  });

  test("recette en attente ou inconnue : 404", async () => {
    await store.insertRecipe({ status: "pending", authorId: null, recipe: uneRecette() });
    expect((await appeler("salade-burrata")).status).toBe(404);
    expect((await appeler("inconnue")).status).toBe(404);
  });

  test("donne les autres versions du plat ; une variante donne aussi variante_de", async () => {
    const a = await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette({ titre: "Lasagnes" }) });
    const b = await store.insertRecipe({
      status: "published",
      authorId: null,
      recipe: uneRecette({ titre: "Lasagnes végé", nom_variante: "Végétarienne" }),
      varianteDe: a.id,
    });
    await store.insertRecipe({ status: "pending", authorId: null, recipe: uneRecette({ titre: "Cachée" }), varianteDe: a.id });

    const ja = await (await appeler("lasagnes")).json();
    expect("variante_de" in ja).toBe(false);
    expect(ja.variantes).toEqual([
      { id: b.id, slug: "lasagnes-vege", titre: "Lasagnes végé", nom_variante: "Végétarienne", lien: "https://x.test/recettes/lasagnes-vege" },
    ]);
    const jb = await (await appeler("lasagnes-vege")).json();
    expect(jb.variante_de).toBe("lasagnes");
    expect(jb.variantes).toEqual([{ id: a.id, slug: "lasagnes", titre: "Lasagnes", lien: "https://x.test/recettes/lasagnes" }]);
  });

  test("une recette seule a une liste de variantes vide", async () => {
    await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette() });
    expect((await (await appeler("salade-burrata")).json()).variantes).toEqual([]);
  });
});

describe("POST /api/recettes", () => {
  test("visiteur : 202, recette en attente", async () => {
    const res = await post("Voilà !\n" + fence(uneRecette()));
    expect(res.status).toBe(202);
    expect(await res.json()).toMatchObject({ status: "pending", slug: "salade-burrata" });
    expect(await store.listRecipes({ status: "pending" })).toHaveLength(1);
  });

  test("appareil de membre : 201, recette publiée", async () => {
    const res = await post(fence(uneRecette()), { cookie: await cookieMembre() });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ status: "published" });
  });

  test("mise à jour par l'auteur : 200", async () => {
    const cookie = await cookieMembre();
    const cree = await (await post(fence(uneRecette()), { cookie })).json();
    const res = await post(fence({ ...uneRecette({ titre: "Corrigée" }), id: cree.id }), { cookie });
    expect(res.status).toBe(200);
    expect((await store.getRecipe(cree.id))?.recipe.titre).toBe("Corrigée");
  });

  test("variante d'une recette : 201, avec la recette de référence (slug et titre)", async () => {
    const cookie = await cookieMembre();
    await post(fence(uneRecette({ titre: "Lasagnes" })), { cookie });
    const res = await post(fence({ ...uneRecette({ titre: "Lasagnes végé" }), variante_de: "lasagnes" }), { cookie });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ variante_de: { slug: "lasagnes", titre: "Lasagnes" } });
  });

  test("variante_de inconnue : 422 avec un message qui dit laquelle", async () => {
    const res = await post(fence({ ...uneRecette(), variante_de: "inconnue" }), { cookie: await cookieMembre() });
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ errors: ["La recette « inconnue » indiquée dans variante_de est introuvable."] });
    expect(await store.listRecipes()).toHaveLength(0);
  });

  test("une recette indépendante n'a pas de champ variante_de dans la réponse", async () => {
    const res = await post(fence(uneRecette()), { cookie: await cookieMembre() });
    expect("variante_de" in (await res.json())).toBe(false);
  });

  test("les avertissements du lecteur sont renvoyés", async () => {
    const res = await post(fence({ ...uneRecette(), categorie: "brunch" }));
    expect((await res.json()).avertissements.join(" ")).toContain("catégorie");
  });

  test("texte sans recette : 422 avec des erreurs en français", async () => {
    const res = await post("Bonjour, juste une idée de salade.");
    expect(res.status).toBe(422);
    expect((await res.json()).errors).toEqual(["Je ne trouve pas de recette dans ce texte."]);
  });

  test("corps qui n'est pas du JSON, ou sans champ texte : 400", async () => {
    const mauvais = await POST(new Request("https://x.test/api/recettes", { method: "POST", body: "pas du json" }));
    expect(mauvais.status).toBe(400);
    expect((await post(42)).status).toBe(400);
  });

  test("charge utile énorme : 413, rien d'écrit", async () => {
    const res = await post("x".repeat(MAX_PAYLOAD_BYTES + 1));
    expect(res.status).toBe(413);
    expect(await store.listRecipes()).toHaveLength(0);
  });

  test("annonce d'une taille énorme dans l'en-tête : 413 sans lire le corps", async () => {
    const res = await POST(
      new Request("https://x.test/api/recettes", {
        method: "POST",
        headers: { "content-length": String(10 * MAX_PAYLOAD_BYTES) },
        body: "{}",
      }),
    );
    expect(res.status).toBe(413);
  });

  test("visiteur : le 6e envoi est refusé (429), une autre adresse passe", async () => {
    for (let i = 0; i < 5; i++) expect((await post(fence(uneRecette()))).status).toBe(202);
    expect((await post(fence(uneRecette()))).status).toBe(429);
    expect((await post(fence(uneRecette()), { "x-forwarded-for": "5.6.7.8" })).status).toBe(202);
  });

  test("visiteur qui tente une mise à jour : 403", async () => {
    const row = await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette() });
    expect((await post(fence({ ...uneRecette(), id: row.id }))).status).toBe(403);
  });
});

describe("POST /api/recettes avec un jeton d'accès (Claude)", () => {
  async function jetonMembre(nom = "Camille") {
    const p = await store.createProfile(nom, "member");
    const { token } = await createAccessToken(store, p.id, "Claude");
    return { profil: p, entete: { authorization: `Bearer ${token}` } };
  }

  test("la recette est publiée tout de suite (201) et rattachée à son auteur, sans cookie", async () => {
    const { profil, entete } = await jetonMembre();
    const res = await post(fence(uneRecette({ titre: "Via Claude" })), entete);
    expect(res.status).toBe(201);
    const { id, status } = await res.json();
    expect(status).toBe("published");
    expect((await store.getRecipe(id))?.authorId).toBe(profil.id);
  });

  test("le jeton n'est pas soumis à la limite des visiteurs (6 envois d'affilée)", async () => {
    const { entete } = await jetonMembre();
    for (let i = 0; i < 6; i++) {
      expect((await post(fence(uneRecette({ titre: `Recette ${i}` })), entete)).status).toBe(201);
    }
  });

  test("jeton inconnu ou retiré : 401, rien n'est enregistré (pas une recette « en attente »)", async () => {
    const res = await post(fence(uneRecette()), { authorization: "Bearer nc_faux" });
    expect(res.status).toBe(401);
    expect((await res.json()).erreur).toMatch(/jeton/i);
    expect(await store.listRecipes()).toHaveLength(0);
  });

  test("jeton faux : 401 avant toute autre vérification, même si le corps de la requête est vide", async () => {
    const res = await POST(
      new Request("https://x.test/api/recettes", {
        method: "POST",
        headers: { authorization: "Bearer nc_faux", "content-type": "application/json" },
        body: "{}",
      }),
    );
    expect(res.status).toBe(401);
  });

  test("un jeton retiré dans « Mon compte » cesse de fonctionner", async () => {
    const { profil, entete } = await jetonMembre();
    const jeton = (await store.listDevices()).find((d) => d.profileId === profil.id)!;
    await store.revokeDevice(jeton.id, new Date().toISOString());
    expect((await post(fence(uneRecette()), entete)).status).toBe(401);
  });
});

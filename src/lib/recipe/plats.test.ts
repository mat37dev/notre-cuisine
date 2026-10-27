import { beforeEach, describe, expect, test } from "vitest";
import { MemoryStore } from "../store/memory";
import type { RecipeRow } from "../store/types";
import { uneRecette } from "./fixtures";
import { platsAffiches } from "./plats";
import type { Recipe } from "./types";

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
});

const ajouter = (titre: string, partiel: Partial<Recipe> = {}, varianteDe?: string, status: "published" | "pending" = "published") =>
  store.insertRecipe({ status, authorId: null, recipe: uneRecette({ titre, ...partiel }), varianteDe });

// l'ordre de listPublished : la plus récente d'abord
const publiees = () => store.listRecipes({ status: "published" });
const titres = (rows: RecipeRow[]) => rows.map((r) => r.recipe.titre);

describe("platsAffiches", () => {
  test("une entrée par plat : la référence en carte, ses variantes à côté", async () => {
    const a = await ajouter("Lasagnes");
    await ajouter("Lasagnes végé", {}, a.id);
    await ajouter("Tarte");
    const plats = platsAffiches(await publiees(), "");
    expect(plats.map((p) => p.carte.recipe.titre)).toEqual(["Tarte", "Lasagnes"]);
    expect(plats[1].total).toBe(2);
    expect(titres(plats[1].autres)).toEqual(["Lasagnes végé"]);
    expect(plats[0]).toMatchObject({ total: 1, autres: [] });
  });

  test("une nouvelle variante fait remonter son plat en tête", async () => {
    const a = await ajouter("Lasagnes");
    await ajouter("Tarte");
    await ajouter("Lasagnes express", {}, a.id);
    expect(platsAffiches(await publiees(), "").map((p) => p.carte.recipe.titre)).toEqual(["Lasagnes", "Tarte"]);
  });

  test("une recherche qui ne trouve qu'une variante montre cette variante en carte", async () => {
    const a = await ajouter("Lasagnes");
    await ajouter("Lasagnes du jardin", { tags: ["végétarien"] }, a.id);
    const [plat, ...rien] = platsAffiches(await publiees(), "vegetarien");
    expect(rien).toEqual([]);
    expect(plat.carte.recipe.titre).toBe("Lasagnes du jardin");
    expect(titres(plat.autres)).toEqual(["Lasagnes"]);
    expect(plat.total).toBe(2);
  });

  test("une variante d'une autre catégorie qui correspond montre le plat", async () => {
    const a = await ajouter("Lasagnes", { categorie: "plat" });
    await ajouter("Lasagnes froides", { categorie: "entree" }, a.id);
    const plats = platsAffiches(await publiees(), "", "entree");
    expect(plats.map((p) => p.carte.recipe.titre)).toEqual(["Lasagnes froides"]);
  });

  test("référence absente (en attente ou supprimée) : la plus ancienne variante publiée sert de carte", async () => {
    const a = await ajouter("Lasagnes", {}, undefined, "pending");
    await ajouter("Lasagnes végé", {}, a.id);
    await ajouter("Lasagnes express", {}, a.id);
    const [plat] = platsAffiches(await publiees(), "");
    expect(plat.carte.recipe.titre).toBe("Lasagnes végé");
    expect(titres(plat.autres)).toEqual(["Lasagnes express"]);
    expect(plat.total).toBe(2);
  });

  test("les autres versions commencent après la carte, puis reprennent au début", async () => {
    const a = await ajouter("Un");
    await ajouter("Deux", { tags: ["choisie"] }, a.id);
    await ajouter("Trois", {}, a.id);
    await ajouter("Quatre", {}, a.id);
    const [plat] = platsAffiches(await publiees(), "choisie");
    expect(plat.carte.recipe.titre).toBe("Deux");
    expect(titres(plat.autres)).toEqual(["Trois", "Quatre", "Un"]);
  });

  test("aucun résultat : liste vide", async () => {
    await ajouter("Lasagnes");
    expect(platsAffiches(await publiees(), "chocolat")).toEqual([]);
  });
});

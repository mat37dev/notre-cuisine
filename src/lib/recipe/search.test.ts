import { describe, expect, test } from "vitest";
import { MemoryStore } from "../store/memory";
import type { RecipeRow } from "../store/types";
import { uneRecette } from "./fixtures";
import { searchRecipes } from "./search";

async function lignes(): Promise<RecipeRow[]> {
  const s = new MemoryStore();
  const mk = (r: Parameters<typeof uneRecette>[0]) => s.insertRecipe({ status: "published", authorId: null, recipe: uneRecette(r) });
  return [
    await mk({ titre: "Crème brûlée", categorie: "dessert", ingredients: [{ id: "oeufs", nom: "œufs", quantite: 4, unite: "piece" }] }),
    await mk({ titre: "Salade italienne", categorie: "salade" }),
    await mk({ titre: "Hachis parmentier", categorie: "plat", tags: ["familial"], ingredients: [{ id: "pdt", nom: "pommes de terre", quantite: 1, unite: "kg" }] }),
  ];
}

const titres = (rows: RecipeRow[]) => rows.map((r) => r.recipe.titre);

describe("searchRecipes", () => {
  test("insensible aux accents et à la casse", async () => {
    expect(titres(searchRecipes(await lignes(), "CREME"))).toEqual(["Crème brûlée"]);
  });

  test("cherche dans les noms d'ingrédients (burrata n'est que dans la salade)", async () => {
    expect(titres(searchRecipes(await lignes(), "burrata"))).toEqual(["Salade italienne"]);
  });

  test("« oeufs » trouve « œufs »", async () => {
    expect(titres(searchRecipes(await lignes(), "oeufs"))).toEqual(["Crème brûlée"]);
  });

  test("cherche dans les tags", async () => {
    expect(titres(searchRecipes(await lignes(), "familial"))).toEqual(["Hachis parmentier"]);
  });

  test("plusieurs mots : tous doivent être présents", async () => {
    expect(titres(searchRecipes(await lignes(), "salade burrata"))).toEqual(["Salade italienne"]);
    expect(searchRecipes(await lignes(), "salade parmentier")).toEqual([]);
  });

  test("filtre par catégorie", async () => {
    expect(titres(searchRecipes(await lignes(), "", "dessert"))).toEqual(["Crème brûlée"]);
  });

  test("recherche vide ou d'espaces : tout est renvoyé", async () => {
    expect(searchRecipes(await lignes(), "")).toHaveLength(3);
    expect(searchRecipes(await lignes(), "   ")).toHaveLength(3);
  });
});

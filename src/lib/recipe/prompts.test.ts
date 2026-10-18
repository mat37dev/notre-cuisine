import { describe, expect, test } from "vitest";
import { MemoryStore } from "../store/memory";
import { uneRecette } from "./fixtures";
import { parseRecipeBlock } from "./parse";
import { buildEditPrompt, EXEMPLE_RECETTE, instructionsClaude } from "./prompts";
import { CATEGORIES, UNITES } from "./types";

describe("EXEMPLE_RECETTE et instructionsClaude", () => {
  test("l'exemple documenté se relit avec le même parseur que l'import (documentation et format restent d'accord)", () => {
    const r = parseRecipeBlock("```json\n" + JSON.stringify(EXEMPLE_RECETTE) + "\n```");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.warnings).toEqual([]);
  });

  test("les instructions contiennent un bloc exemple que le parseur sait lire", () => {
    const r = parseRecipeBlock(instructionsClaude("https://x.test"));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.recipe.titre).toBe(EXEMPLE_RECETTE.titre);
  });

  test("les instructions donnent les adresses du site, toutes les unités et toutes les catégories", () => {
    const texte = instructionsClaude("https://x.test");
    expect(texte).toContain("https://x.test/api/recettes?q=");
    expect(texte).toContain("https://x.test/api/recettes/");
    for (const u of UNITES.filter(Boolean)) expect(texte).toContain(u);
    for (const c of CATEGORIES) expect(texte).toContain(c);
  });

  test("une origine avec barre finale ne double pas la barre", () => {
    expect(instructionsClaude("https://x.test/")).not.toContain("test//api");
  });
});

describe("buildEditPrompt", () => {
  test("contient l'id et la recette, qui se relit avec le même id", async () => {
    const store = new MemoryStore();
    const row = await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette({ titre: "Gratin" }) });
    const prompt = buildEditPrompt(row);
    expect(prompt).toContain(row.id);
    const r = parseRecipeBlock(prompt);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.recipe.id).toBe(row.id);
      expect(r.recipe.titre).toBe("Gratin");
      expect(r.recipe.ingredients).toEqual(row.recipe.ingredients);
    }
  });
});

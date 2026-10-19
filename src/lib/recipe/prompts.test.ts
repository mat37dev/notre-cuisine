import { describe, expect, test } from "vitest";
import { MemoryStore } from "../store/memory";
import { uneRecette } from "./fixtures";
import { parseRecipeBlock } from "./parse";
import { buildEditPrompt, documentationClaude, EXEMPLE_RECETTE, instructionsClaude } from "./prompts";
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

describe("documentationClaude", () => {
  const doc = documentationClaude("https://x.test/");

  test("dit tout ce qu'il faut pour lire le site : adresses, catégories, présentation", () => {
    expect(doc).toContain("https://x.test/api/recettes?q=");
    expect(doc).toContain("https://x.test/api/recettes/");
    expect(doc).not.toContain("test//api");
    for (const c of CATEGORIES) expect(doc).toContain(c);
  });

  test("décrit le format complet : toutes les unités, l'image, les chronos, les références d'ingrédients", () => {
    for (const u of UNITES.filter(Boolean)) expect(doc).toContain(u);
    expect(doc).toContain("image");
    expect(doc).toContain("chrono_secondes");
    expect(doc).toContain("{{id}}");
  });

  test("explique l'envoi direct avec un jeton : requête, en-tête Authorization, réponses, et la discrétion du jeton", () => {
    expect(doc).toMatch(/## Envoyer directement/);
    expect(doc).toContain("POST https://x.test/api/recettes");
    expect(doc).toContain('{"texte"');
    expect(doc).toContain("Authorization: Bearer");
    expect(doc).toContain("« Mon compte »");
    expect(doc).toMatch(/401/);
    expect(doc).toMatch(/201/);
    expect(doc).toMatch(/ne l'écris jamais dans une recette/);
  });

  test("dit comment envoyer depuis une discussion Claude : exécution de code, domaine autorisé dans Paramètres > Capacités", () => {
    expect(doc).toMatch(/exécution de code/);
    expect(doc).toContain("Paramètres");
    expect(doc).toContain("Capacités");
    expect(doc).toContain("x.test");
    expect(doc).toMatch(/Erreur réseau|bloqu/i);
  });

  test("explique comment changer seulement l'image d'une recette avec une adresse", () => {
    expect(doc).toContain("PUT https://x.test/api/recettes/IDENTIFIANT/image");
    expect(doc).toContain('{"url"');
  });

  test("explique comment ajouter et modifier une recette, et ce qu'il ne peut pas faire seul", () => {
    expect(doc).toMatch(/Ajouter une recette/);
    expect(doc).toMatch(/Modifier une recette/);
    expect(doc).toMatch(/ne peux pas/);
  });

  test("l'exemple de la documentation se relit avec le même parseur que l'import", () => {
    const r = parseRecipeBlock(doc);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.recipe.titre).toBe(EXEMPLE_RECETTE.titre);
      expect(r.warnings).toEqual([]);
    }
  });

  test("les instructions à coller renvoient vers la documentation", () => {
    expect(instructionsClaude("https://x.test")).toContain("https://x.test/docs");
  });
});

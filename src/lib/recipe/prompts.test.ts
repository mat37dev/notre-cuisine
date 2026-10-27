import { describe, expect, test } from "vitest";
import { MemoryStore } from "../store/memory";
import { uneRecette } from "./fixtures";
import { parseRecipeBlock } from "./parse";
import { slugify } from "./slug";
import {
  buildEditPrompt,
  buildVariantPrompt,
  documentationClaude,
  EXEMPLE_RECETTE,
  EXEMPLE_VARIANTE,
  instructionsClaude,
} from "./prompts";
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

  test("les instructions laissent Claude choisir une image : adresse https directe, jamais devinée", () => {
    const texte = instructionsClaude("https://x.test");
    expect(texte).toMatch(/choisis (toi-même )?une image/i);
    expect(texte).toMatch(/ne devine jamais/i);
    expect(texte).not.toMatch(/n'en invente jamais/);
    expect(texte).not.toMatch(/seulement si je t'en donne une/);
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

  test("autorise Claude à choisir lui-même l'image, avec la méthode : recherche, adresse directe, vérification", () => {
    expect(doc).toMatch(/## Choisir une image/);
    expect(doc).toContain("Wikimedia Commons");
    expect(doc).toMatch(/\.jpg/);
    expect(doc).toMatch(/500 caractères/);
    expect(doc).toMatch(/ne devine jamais/i);
    expect(doc).toMatch(/laisse le champ image de côté/);
    expect(doc).not.toMatch(/N'invente jamais l'adresse d'une image : mets le champ image seulement si la personne/);
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

describe("variantes", () => {
  const doc = documentationClaude("https://x.test");

  test("EXEMPLE_VARIANTE se relit avec le parseur, avec variante_de et nom_variante, sans le jambon", () => {
    const r = parseRecipeBlock("```json\n" + JSON.stringify(EXEMPLE_VARIANTE) + "\n```");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.warnings).toEqual([]);
      expect(r.recipe.variante_de).toBe("salade-italienne-a-la-burrata");
      expect(slugify(EXEMPLE_RECETTE.titre)).toBe(r.recipe.variante_de);
      expect(r.recipe.nom_variante).toBe("Végétarienne");
      expect(r.recipe.ingredients.map((i) => i.id)).not.toContain("jambon");
      expect(JSON.stringify(r.recipe.etapes)).not.toContain("{{jambon}}");
    }
  });

  test("la documentation explique les variantes : champs, section dédiée, réponses de l'API, refus", () => {
    expect(doc).toContain("variante_de");
    expect(doc).toContain("nom_variante");
    expect(doc).toContain("## Proposer une variante");
    expect(doc).toContain('"variantes"');
    expect(doc).toContain("indiquée dans variante_de est introuvable");
    expect(doc).toContain(JSON.stringify(EXEMPLE_VARIANTE, null, 2));
  });

  test("la section « Modifier une recette » dit comment détacher une variante", () => {
    const section = doc.split("## Modifier une recette")[1].split("\n## ")[0];
    expect(section).toContain('"variante_de": null');
  });

  test("les instructions à coller ont un point sur les variantes", () => {
    const texte = instructionsClaude("https://x.test");
    expect(texte).toContain("4. Quand je veux une variante");
    expect(texte).toContain("variante_de");
    expect(texte).toContain("nom_variante");
  });

  test("buildVariantPrompt : demande une variante du slug, sans l'id de la recette d'origine", async () => {
    const store = new MemoryStore();
    const row = await store.insertRecipe({
      status: "published",
      authorId: null,
      recipe: uneRecette({ titre: "Gratin", nom_variante: "Classique" }),
    });
    const prompt = buildVariantPrompt(row);
    expect(prompt).toContain('"variante_de": "gratin"');
    expect(prompt).not.toContain(row.id);
    expect(prompt).not.toContain("Classique");
    expect(prompt.trimEnd()).toMatch(/Ce que je veux changer :$/);
    const r = parseRecipeBlock(prompt);
    expect(r.ok && r.recipe.id).toBeFalsy();
    expect(r.ok && r.recipe.titre).toBe("Gratin");
  });

  test("buildEditPrompt d'une variante garde variante_de dans le bloc", async () => {
    const store = new MemoryStore();
    const row = await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette() });
    const prompt = buildEditPrompt(row, "lasagnes");
    expect(prompt).toContain(row.id);
    const r = parseRecipeBlock(prompt);
    expect(r.ok && r.recipe.variante_de).toBe("lasagnes");
    expect(buildEditPrompt(row)).not.toContain("variante_de");
  });
});

describe("buildVariantPrompt : une image par variante", () => {
  test("le bloc de départ ne contient pas l'image de l'originale (Claude en choisit une pour la variante)", async () => {
    const store = new MemoryStore();
    const row = await store.insertRecipe({
      status: "published",
      authorId: null,
      recipe: uneRecette({ titre: "Gratin", image: "https://img.test/originale.jpg" }),
    });
    const prompt = buildVariantPrompt(row);
    expect(prompt).not.toContain("https://img.test/originale.jpg");
    expect(prompt).toMatch(/image/i);
  });
});

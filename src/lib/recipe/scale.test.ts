import { describe, expect, test } from "vitest";
import { formatQuantity, renderStepText } from "./scale";
import type { Ingredient, Unite } from "./types";

describe("formatQuantity", () => {
  test.each<[number | null, Unite, number, number, string]>([
    // g et ml : multiples de 5, à l'unité sous 10
    [90, "ml", 4, 1, "25 ml"],
    [500, "g", 4, 1, "125 g"],
    [60, "ml", 4, 6, "90 ml"],
    [7, "g", 4, 1, "2 g"],
    [0.3, "g", 4, 1, "1 g"],
    // kilos et litres
    [1500, "g", 4, 4, "1,5 kg"],
    [1000, "ml", 4, 4, "1 l"],
    [1250, "g", 4, 4, "1,25 kg"],
    [1, "kg", 4, 1, "250 g"],
    [2, "l", 4, 4, "2 l"],
    // cuillères : au quart
    [3, "cas", 4, 1, "¾ càs"],
    [1, "cas", 2, 3, "1 ½ càs"],
    [1, "cac", 4, 1, "¼ càc"],
    [2, "cas", 4, 4, "2 càs"],
    // pièces : à la demie
    [4, "piece", 4, 1, "1"],
    [1, "piece", 4, 2, "½"],
    [3, "piece", 4, 1, "1"],
    [1, "piece", 4, 1, "½"],
    [3, "", 4, 6, "4 ½"],
    // pincées : entier, au moins 1
    [2, "pincee", 4, 1, "1 pincée"],
    [2, "pincee", 4, 4, "2 pincées"],
    // pas de quantité
    [null, "g", 4, 2, ""],
    [0, "g", 4, 2, ""],
  ])("%s %s (%s → %s portions) s'affiche « %s »", (q, u, base, cible, attendu) => {
    expect(formatQuantity(q, u, base, cible)).toBe(attendu);
  });

  test.each([0, -1, Number.NaN])("portions cible %s : lève RangeError", (cible) => {
    expect(() => formatQuantity(100, "g", 4, cible)).toThrow(RangeError);
  });

  test("portions de base à 0 : lève RangeError", () => {
    expect(() => formatQuantity(100, "g", 0, 2)).toThrow(RangeError);
  });

  test("très grandes portions : reste un nombre lisible, jamais NaN", () => {
    const s = formatQuantity(250, "g", 4, 50);
    expect(s).toBe("3,13 kg");
    expect(s).not.toContain("NaN");
  });
});

describe("renderStepText", () => {
  const pignons: Ingredient = { id: "pignons", nom: "pignons de pin", quantite: 40, unite: "g" };
  const sel: Ingredient = { id: "sel", nom: "sel", quantite: null, unite: "" };

  test("remplace la référence par la quantité recalculée", () => {
    expect(renderStepText("Faire dorer {{pignons}} de pignons", [pignons], 4, 2)).toBe(
      "Faire dorer 20 g de pignons",
    );
  });

  test("accepte des espaces dans les accolades", () => {
    expect(renderStepText("Dorer {{ pignons }}.", [pignons], 4, 4)).toBe("Dorer 40 g.");
  });

  test("référence inconnue : texte simple", () => {
    expect(renderStepText("Ajouter {{inconnu}}", [pignons], 4, 2)).toBe("Ajouter inconnu");
  });

  test("ingrédient sans quantité : « un peu »", () => {
    expect(renderStepText("Ajouter {{sel}} de sel", [sel], 4, 2)).toBe("Ajouter un peu de sel");
  });

  test("texte sans référence : inchangé", () => {
    expect(renderStepText("Mélanger.", [pignons], 4, 2)).toBe("Mélanger.");
  });
});

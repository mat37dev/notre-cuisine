import type { Recipe } from "./types";

/** Recette d'exemple pour les tests ; `partiel` écrase les champs voulus. */
export function uneRecette(partiel: Partial<Recipe> = {}): Recipe {
  return {
    titre: "Salade burrata",
    description: "Une salade fraîche.",
    portions: 4,
    categorie: "salade",
    tags: ["rapide"],
    ingredients: [
      { id: "burrata", nom: "burrata", quantite: 4, unite: "piece" },
      { id: "tomates", nom: "tomates cerises", quantite: 400, unite: "g" },
      { id: "pignons", nom: "pignons de pin", quantite: 40, unite: "g" },
    ],
    etapes: [
      { titre: "Préparer", texte: "Couper {{tomates}} de tomates." },
      { titre: "Dorer", texte: "Faire dorer {{pignons}} de pignons.", chrono_secondes: 150 },
    ],
    notes: "Sortir la burrata au dernier moment.",
    ...partiel,
  };
}

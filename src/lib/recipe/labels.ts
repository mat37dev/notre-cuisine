import type { Categorie } from "./types";

export const LIBELLES_CATEGORIES: Record<Categorie, string> = {
  entree: "Entrée",
  salade: "Salade",
  plat: "Plat",
  dessert: "Dessert",
  gouter: "Goûter",
  sauce: "Sauce",
  autre: "Autre",
};

export const EMOJIS_CATEGORIES: Record<Categorie, string> = {
  entree: "🥣",
  salade: "🥗",
  plat: "🍲",
  dessert: "🍰",
  gouter: "🍪",
  sauce: "🫙",
  autre: "🍽️",
};

/** Teinte (0 à 360) du fond illustré d'une recette sans photo. */
export const TEINTES_CATEGORIES: Record<Categorie, string> = {
  entree: "38",
  salade: "100",
  plat: "20",
  dessert: "340",
  gouter: "32",
  sauce: "8",
  autre: "55",
};

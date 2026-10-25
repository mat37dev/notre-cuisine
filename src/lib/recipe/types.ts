export const UNITES = ["g", "kg", "ml", "l", "cas", "cac", "pincee", "piece", ""] as const;
export type Unite = (typeof UNITES)[number];

export const CATEGORIES = ["entree", "salade", "plat", "dessert", "gouter", "sauce", "cocktail", "autre"] as const;
export type Categorie = (typeof CATEGORIES)[number];

export const MAX_INGREDIENTS = 100;
export const MAX_ETAPES = 60;
export const MAX_PAYLOAD_BYTES = 100_000;

export type Ingredient = {
  id: string;
  nom: string;
  quantite: number | null;
  unite: Unite;
};

export type Etape = {
  titre?: string;
  texte: string;
  chrono_secondes?: number;
};

export type Recipe = {
  id?: string;
  titre: string;
  description?: string;
  /** Adresse https d'une image de présentation (envoyée depuis le site, ou donnée dans le bloc). */
  image?: string;
  portions: number;
  categorie: Categorie;
  tags: string[];
  ingredients: Ingredient[];
  etapes: Etape[];
  notes?: string;
};

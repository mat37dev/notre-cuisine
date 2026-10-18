import { slugify } from "./slug";
import type { Ingredient, Unite } from "./types";

const FRACTIONS: Record<number, string> = { 0.25: "¼", 0.5: "½", 0.75: "¾" };

function nombreFr(n: number): string {
  return String(Number(n.toFixed(2))).replace(".", ",");
}

/** Entier plus fraction lisible : 1.5 → « 1 ½ », 0.75 → « ¾ ». `n` est un multiple de 0,25. */
function fractionFr(n: number): string {
  const entier = Math.floor(n);
  const reste = n - entier;
  const f = FRACTIONS[reste];
  if (!f) return String(entier);
  return entier === 0 ? f : `${entier} ${f}`;
}

function poidsOuVolume(valeur: number, petite: "g" | "ml", grande: "kg" | "l"): string {
  const arrondi = valeur < 10 ? Math.max(1, Math.round(valeur)) : Math.round(valeur / 5) * 5;
  if (arrondi >= 1000) return `${nombreFr(arrondi / 1000)} ${grande}`;
  return `${arrondi} ${petite}`;
}

export function formatQuantity(
  quantite: number | null,
  unite: Unite,
  portionsBase: number,
  portionsCible: number,
): string {
  if (!(portionsBase > 0) || !(portionsCible > 0)) {
    throw new RangeError("Le nombre de portions doit être supérieur à 0.");
  }
  if (quantite === null || !(quantite > 0)) return "";
  const v = (quantite * portionsCible) / portionsBase;

  switch (unite) {
    case "g":
      return poidsOuVolume(v, "g", "kg");
    case "ml":
      return poidsOuVolume(v, "ml", "l");
    case "kg":
      return v < 1 ? poidsOuVolume(v * 1000, "g", "kg") : `${nombreFr(Math.round(v * 20) / 20)} kg`;
    case "l":
      return v < 1 ? poidsOuVolume(v * 1000, "ml", "l") : `${nombreFr(Math.round(v * 20) / 20)} l`;
    case "cas":
      return `${fractionFr(Math.max(0.25, Math.round(v * 4) / 4))} càs`;
    case "cac":
      return `${fractionFr(Math.max(0.25, Math.round(v * 4) / 4))} càc`;
    case "pincee": {
      const n = Math.max(1, Math.round(v));
      return `${n} ${n > 1 ? "pincées" : "pincée"}`;
    }
    case "piece":
    case "":
      return fractionFr(Math.max(0.5, Math.round(v * 2) / 2));
  }
}

/** Remplace chaque `{{id}}` par la quantité recalculée de l'ingrédient (sans son nom). */
export function renderStepText(
  texte: string,
  ingredients: Ingredient[],
  portionsBase: number,
  portionsCible: number,
): string {
  return texte.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, ref: string) => {
    const ing = ingredients.find((i) => i.id === ref) ?? ingredients.find((i) => i.id === slugify(ref));
    if (!ing) return ref;
    return formatQuantity(ing.quantite, ing.unite, portionsBase, portionsCible) || "un peu";
  });
}

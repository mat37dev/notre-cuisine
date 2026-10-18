import type { RecipeRow } from "../store/types";

const plier = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/gi, "oe")
    .toLowerCase();

/** Recettes dont le titre, les ingrédients ou les tags contiennent tous les mots cherchés. */
export function searchRecipes(rows: RecipeRow[], q: string, categorie?: string): RecipeRow[] {
  const mots = plier(q).split(/\s+/).filter(Boolean);
  return rows.filter((row) => {
    if (categorie && row.recipe.categorie !== categorie) return false;
    if (mots.length === 0) return true;
    const texte = plier(
      [row.recipe.titre, ...row.recipe.ingredients.map((i) => i.nom), ...row.recipe.tags].join(" "),
    );
    return mots.every((m) => texte.includes(m));
  });
}

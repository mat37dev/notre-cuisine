import type { RecipeRow } from "../store/types";
import { searchRecipes } from "./search";

/** Un plat tel qu'il apparaît sur l'accueil : une carte, et les autres versions du même plat. */
export type PlatAffiche = {
  /** La recette montrée sur la carte. */
  carte: RecipeRow;
  /** Les autres recettes publiées du plat, en commençant par celles qui suivent la carte. */
  autres: RecipeRow[];
  /** Nombre de recettes publiées du plat, carte comprise. */
  total: number;
};

/**
 * Regroupe les recettes publiées par plat, et garde les plats dont au moins une recette correspond à la recherche.
 * `rows` est dans l'ordre de `listPublished` (la plus récente d'abord) : un plat prend la place de sa recette la plus
 * récente, et dans un plat, la référence vient d'abord, puis les variantes de la plus ancienne à la plus récente.
 * La carte est la référence si elle correspond, sinon la plus ancienne recette du plat qui correspond.
 */
export function platsAffiches(rows: RecipeRow[], q: string, categorie?: string): PlatAffiche[] {
  const groupes = new Map<string, RecipeRow[]>();
  for (const row of rows) {
    const racine = row.varianteDe ?? row.id;
    groupes.set(racine, [row, ...(groupes.get(racine) ?? [])]);
  }
  const trouvees = new Set(searchRecipes(rows, q, categorie).map((r) => r.id));

  const plats: PlatAffiche[] = [];
  for (const [racine, recettes] of groupes) {
    const reference = recettes.findIndex((r) => r.id === racine);
    if (reference > 0) recettes.unshift(...recettes.splice(reference, 1));
    const i = recettes.findIndex((r) => trouvees.has(r.id));
    if (i < 0) continue;
    plats.push({
      carte: recettes[i],
      autres: [...recettes.slice(i + 1), ...recettes.slice(0, i)],
      total: recettes.length,
    });
  }
  return plats;
}

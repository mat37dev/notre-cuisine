/** Texte sans accents ni majuscules, mots séparés par des tirets. */
export function slugify(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Adresse lisible d'une recette, différente de toutes celles de `existants` (suffixe -2, -3…). */
export function makeSlug(titre: string, existants: Set<string>): string {
  const base = slugify(titre) || "recette";
  let slug = base;
  for (let n = 2; existants.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

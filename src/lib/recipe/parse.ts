import { slugify } from "./slug";
import {
  CATEGORIES,
  MAX_ETAPES,
  MAX_INGREDIENTS,
  type Categorie,
  type Etape,
  type Ingredient,
  type Recipe,
  type Unite,
} from "./types";

export type ParseResult =
  | { ok: true; recipe: Recipe; warnings: string[] }
  | { ok: false; errors: string[] };

type Obj = Record<string, unknown>;

const ALIAS_CLES: Record<string, string> = {
  title: "titre",
  name: "nom",
  steps: "etapes",
  servings: "portions",
  amount: "quantite",
  unit: "unite",
  content: "texte",
  text: "texte",
  timer_seconds: "chrono_secondes",
  photo: "image",
  image_url: "image",
};

const UNITES_ALIAS: Record<Exclude<Unite, "">, string[]> = {
  g: ["g", "gr", "gramme", "grammes", "gram", "grams"],
  kg: ["kg", "kilo", "kilos", "kilogramme", "kilogrammes", "kilogram", "kilograms"],
  ml: ["ml", "millilitre", "millilitres", "milliliter", "milliliters"],
  l: ["l", "litre", "litres", "liter", "liters"],
  cas: ["cas", "cs", "c a s", "c a soupe", "cuillere a soupe", "cuilleres a soupe", "tbsp", "tablespoon", "tablespoons"],
  cac: ["cac", "cc", "c a c", "c a cafe", "cuillere a cafe", "cuilleres a cafe", "tsp", "teaspoon", "teaspoons"],
  pincee: ["pincee", "pincees", "pinch", "pinches"],
  piece: ["piece", "pieces", "unite", "unites", "pc", "pcs"],
};

const sansAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const estObjet = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

function normaliserCle(cle: string): string {
  const k = sansAccents(cle).toLowerCase().trim().replace(/[\s-]+/g, "_");
  return ALIAS_CLES[k] ?? k;
}

function canon(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canon);
  if (estObjet(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [normaliserCle(k), canon(x)]));
  return v;
}

function blocsDeCode(texte: string): string[] {
  return [...texte.matchAll(/```[^\n`]*\n([\s\S]*?)```/g)].map((m) => m[1]);
}

const FERMETURES: Record<string, string> = { '"': '"', "“": "”", "„": "”" };

/** Sous-textes `{ ... }` de premier niveau (accolades équilibrées, chaînes respectées). */
function objetsEquilibres(texte: string): string[] {
  const trouves: string[] = [];
  // Chaque accolade jamais refermée oblige à relire tout le reste du texte : on abandonne après
  // quelques essais ratés, sinon un long texte d'accolades ouvertes occuperait le serveur très longtemps.
  const ESSAIS_RATES_MAX = 10;
  let rates = 0;
  let i = 0;
  while (i < texte.length && rates < ESSAIS_RATES_MAX) {
    if (texte[i] !== "{") {
      i++;
      continue;
    }
    let profondeur = 0;
    let fermeture: string | null = null;
    let fin = -1;
    for (let j = i; j < texte.length; j++) {
      const c = texte[j];
      if (fermeture) {
        if (c === "\\") j++;
        else if (c === fermeture) fermeture = null;
        continue;
      }
      if (c in FERMETURES) fermeture = FERMETURES[c];
      else if (c === "{") profondeur++;
      else if (c === "}" && --profondeur === 0) {
        fin = j;
        break;
      }
    }
    if (fin === -1) {
      rates++;
      i++;
    } else {
      trouves.push(texte.slice(i, fin + 1));
      i = fin + 1;
    }
  }
  return trouves;
}

function lireJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    try {
      return JSON.parse(s.replace(/[“”„]/g, '"').replace(/,\s*([}\]])/g, "$1"));
    } catch {
      return undefined;
    }
  }
}

function ressembleARecette(v: unknown): v is Obj {
  return estObjet(v) && ("ingredients" in v || "titre" in v);
}

function trouverRecette(texte: string): Obj | null {
  const candidats: string[] = [];
  for (const bloc of blocsDeCode(texte)) {
    candidats.push(bloc.trim());
    for (const o of objetsEquilibres(bloc)) candidats.push(o);
  }
  for (const o of objetsEquilibres(texte)) candidats.push(o);
  for (const c of candidats) {
    try {
      let v = canon(lireJson(c));
      if (estObjet(v)) {
        const interne = v.recette ?? v.recipe;
        if (ressembleARecette(interne)) v = interne;
      }
      if (ressembleARecette(v)) return v;
    } catch {
      // JSON imbriqué à l'extrême (dépassement de pile) : ce candidat n'est pas une recette
    }
  }
  return null;
}

function nombre(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v !== "string") return NaN;
  const s = v.trim().replace(",", ".");
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  const mixte = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixte) return Number(mixte[1]) + Number(mixte[2]) / Number(mixte[3]);
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return NaN;
}

function texteOuVide(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function normaliserUnite(v: unknown): Unite | null {
  const s = sansAccents(texteOuVide(v)).toLowerCase().replace(/\./g, " ").replace(/\s+/g, " ").trim();
  if (s === "") return "";
  for (const [code, alias] of Object.entries(UNITES_ALIAS)) {
    if (alias.includes(s)) return code as Unite;
  }
  return null;
}

export function parseRecipeBlock(text: string): ParseResult {
  const brut = trouverRecette(text);
  if (!brut) return { ok: false, errors: ["Je ne trouve pas de recette dans ce texte."] };

  const errors: string[] = [];
  const warnings: string[] = [];

  const titre = texteOuVide(brut.titre);
  if (!titre) errors.push("Il manque le titre.");

  let portions = nombre(brut.portions);
  if (!Number.isFinite(portions) || portions <= 0) {
    portions = 4;
    warnings.push("Nombre de portions absent ou invalide : 4 portions utilisées.");
  }

  const cat = sansAccents(texteOuVide(brut.categorie)).toLowerCase();
  let categorie: Categorie = "autre";
  if ((CATEGORIES as readonly string[]).includes(cat)) categorie = cat as Categorie;
  else warnings.push("La catégorie est inconnue ou absente : « autre » utilisée.");

  const tags = Array.isArray(brut.tags) ? brut.tags.map(texteOuVide).filter(Boolean) : [];

  const ingredients: Ingredient[] = [];
  const bruts = Array.isArray(brut.ingredients) ? brut.ingredients : [];
  if (bruts.length === 0) errors.push("Aucun ingrédient.");
  if (bruts.length > MAX_INGREDIENTS) errors.push(`Trop d'ingrédients (maximum ${MAX_INGREDIENTS}).`);
  const idsPris = new Set<string>();
  bruts.slice(0, MAX_INGREDIENTS).forEach((x, i) => {
    const o = estObjet(x) ? x : {};
    const nom = texteOuVide(o.nom);
    if (!nom) {
      errors.push(`L'ingrédient ${i + 1} n'a pas de nom.`);
      return;
    }
    const idVoulu = slugify(texteOuVide(o.id) || nom) || "ingredient";
    let id = idVoulu;
    for (let n = 2; idsPris.has(id); n++) id = `${idVoulu}-${n}`;
    if (id !== idVoulu) warnings.push(`L'identifiant « ${idVoulu} » apparaît plusieurs fois, renommé « ${id} ».`);
    idsPris.add(id);

    const q = nombre(o.quantite);
    const quantite = Number.isFinite(q) && q > 0 ? q : null;

    let unite = normaliserUnite(o.unite);
    if (unite === null) {
      warnings.push(`Unité inconnue « ${texteOuVide(o.unite)} » ignorée pour « ${nom} » : ajoute-la au nom de l'ingrédient.`);
      unite = "";
    }
    ingredients.push({ id, nom, quantite, unite });
  });

  const etapes: Etape[] = [];
  const brutesEtapes = Array.isArray(brut.etapes) ? brut.etapes : [];
  if (brutesEtapes.length === 0) errors.push("Aucune étape.");
  if (brutesEtapes.length > MAX_ETAPES) errors.push(`Trop d'étapes (maximum ${MAX_ETAPES}).`);
  brutesEtapes.slice(0, MAX_ETAPES).forEach((x, i) => {
    const o = typeof x === "string" ? { texte: x } : estObjet(x) ? x : {};
    const texte = texteOuVide(o.texte).replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_m, id: string) => `{{${slugify(id)}}}`);
    if (!texte) {
      errors.push(`L'étape ${i + 1} n'a pas de texte.`);
      return;
    }
    const etape: Etape = { texte };
    const titreEtape = texteOuVide(o.titre);
    if (titreEtape) etape.titre = titreEtape;
    const chrono = nombre(o.chrono_secondes);
    if (Number.isFinite(chrono) && chrono > 0) etape.chrono_secondes = Math.round(chrono);
    etapes.push(etape);
  });

  if (errors.length > 0) return { ok: false, errors };

  const recipe: Recipe = { titre, portions, categorie, tags, ingredients, etapes };
  const id = texteOuVide(brut.id);
  if (id) recipe.id = id;
  const description = texteOuVide(brut.description);
  if (description) recipe.description = description;
  const notes = texteOuVide(brut.notes);
  if (notes) recipe.notes = notes;
  const image = texteOuVide(brut.image);
  if (image) {
    if (/^https:\/\/\S+$/.test(image) && image.length <= 500) recipe.image = image;
    else warnings.push("L'image est ignorée : il faut une adresse commençant par https:// (500 caractères au maximum).");
  }
  return { ok: true, recipe, warnings };
}

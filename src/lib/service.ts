import type { Viewer } from "./auth";
import { searchRecipes } from "./recipe/search";
import { MAX_PAYLOAD_BYTES, type Recipe } from "./recipe/types";
import type { RecipeRow, Store } from "./store/types";

export type ServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: "forbidden" | "not_found" | "rate_limited" | "too_large" | "variante_introuvable" };

const ok = <T>(value: T): ServiceResult<T> => ({ ok: true, value });
const fail = (code: Extract<ServiceResult<never>, { ok: false }>["code"]): ServiceResult<never> => ({ ok: false, code });

const VISITOR_LIMIT = 5;
const VISITOR_WINDOW_MS = 3600 * 1000;

export function canView(viewer: Viewer, row: RecipeRow): boolean {
  if (row.status === "published") return true;
  return viewer.role === "admin" || (viewer.profileId !== null && row.authorId === viewer.profileId);
}

export function canEdit(viewer: Viewer, row: RecipeRow): boolean {
  if (viewer.role === "admin") return true;
  // Tout membre connecté peut modifier n'importe quelle recette, même si elle n'est pas la sienne.
  return viewer.role === "member" && viewer.profileId !== null;
}

/** Id de la recette de référence du plat de `row` (la sienne si elle est seule ou si c'est la référence). */
export function racineDe(row: RecipeRow): string {
  return row.varianteDe ?? row.id;
}

/** La recette de référence du plat visé par `variante_de` (slug ou id), ou `null` si `viewer` ne peut pas la voir. */
async function resoudreVariante(store: Store, viewer: Viewer, ref: string): Promise<RecipeRow | null> {
  const visee = await store.getRecipe(ref);
  if (!visee || !canView(viewer, visee)) return null;
  return visee.varianteDe ? ((await store.getRecipe(visee.varianteDe)) ?? visee) : visee;
}

/** Recettes du plat dont `racineId` est la référence, de la plus récente à la plus ancienne (ordre de `listRecipes`). */
async function variantesDe(store: Store, racineId: string): Promise<RecipeRow[]> {
  return (await store.listRecipes()).filter((r) => r.varianteDe === racineId);
}

/**
 * Recettes du plat de `row` que `viewer` peut voir dans les pastilles : les publiées, plus `row` elle-même.
 * La référence d'abord, puis les variantes de la plus ancienne à la plus récente.
 */
export async function listerGroupe(store: Store, viewer: Viewer, row: RecipeRow): Promise<RecipeRow[]> {
  const racine = racineDe(row);
  const groupe = (await store.listRecipes())
    .filter((r) => racineDe(r) === racine && (r.id === row.id || (r.status === "published" && canView(viewer, r))))
    .reverse();
  const reference = groupe.findIndex((r) => r.id === racine);
  if (reference > 0) groupe.unshift(...groupe.splice(reference, 1));
  return groupe;
}

/** Ajoute une recette, ou met à jour celle dont `recipe.id` est renseigné. */
export async function submitRecipe(
  store: Store,
  viewer: Viewer,
  recipe: Recipe,
  ctx: { ipHash: string; now?: () => number },
): Promise<ServiceResult<RecipeRow>> {
  const now = ctx.now ?? Date.now;
  if (Buffer.byteLength(JSON.stringify(recipe), "utf8") > MAX_PAYLOAD_BYTES) return fail("too_large");

  if (recipe.id) {
    if (viewer.role === "visitor") return fail("forbidden");
    const existante = await store.getRecipe(recipe.id);
    if (!existante) return fail("not_found");
    if (!canEdit(viewer, existante)) return fail("forbidden");
    // un bloc renvoyé par Claude oublie souvent l'image, le plat ou le nom de variante : on garde ce qui existe
    const aGarder = { ...recipe };
    if (!aGarder.image && existante.recipe.image) aGarder.image = existante.recipe.image;
    if (aGarder.nom_variante === undefined && existante.recipe.nom_variante) {
      aGarder.nom_variante = existante.recipe.nom_variante;
    }
    if (aGarder.nom_variante === null) delete aGarder.nom_variante;

    let varianteDe: string | null | undefined; // undefined : le rattachement ne change pas
    if (recipe.variante_de === null) varianteDe = null;
    else if (recipe.variante_de) {
      const racine = await resoudreVariante(store, viewer, recipe.variante_de);
      if (!racine) return fail("variante_introuvable");
      if (racine.id !== racineDe(existante)) {
        varianteDe = racine.id;
        // une référence qui rejoint un autre plat y emmène ses variantes (un seul niveau)
        for (const v of await variantesDe(store, existante.id)) await store.updateRecipe(v.id, { varianteDe: racine.id });
      }
    }
    const maj = await store.updateRecipe(existante.id, { recipe: aGarder, varianteDe });
    return maj ? ok(maj) : fail("not_found");
  }

  let varianteDe: string | null = null;
  if (recipe.variante_de) {
    const racine = await resoudreVariante(store, viewer, recipe.variante_de);
    if (!racine) return fail("variante_introuvable");
    varianteDe = racine.id;
  }
  if (recipe.nom_variante === null) {
    recipe = { ...recipe };
    delete recipe.nom_variante;
  }

  if (viewer.role === "visitor") {
    const depuis = new Date(now() - VISITOR_WINDOW_MS).toISOString();
    if ((await store.countSubmissions(ctx.ipHash, depuis)) >= VISITOR_LIMIT) return fail("rate_limited");
    const row = await store.insertRecipe({ status: "pending", authorId: null, recipe, varianteDe });
    await store.logSubmission(ctx.ipHash, new Date(now()).toISOString());
    return ok(row);
  }
  return ok(await store.insertRecipe({ status: "published", authorId: viewer.profileId, recipe, varianteDe }));
}

export async function approveRecipe(store: Store, viewer: Viewer, id: string): Promise<ServiceResult<RecipeRow>> {
  if (viewer.role !== "admin") return fail("forbidden");
  const row = await store.updateRecipe(id, { status: "published" });
  return row ? ok(row) : fail("not_found");
}

export async function removeRecipe(store: Store, viewer: Viewer, id: string): Promise<ServiceResult<true>> {
  if (viewer.role === "visitor") return fail("forbidden");
  const row = await store.getRecipe(id);
  if (!row) return fail("not_found");
  if (!canEdit(viewer, row)) return fail("forbidden");
  // la référence d'un plat s'en va : sa plus ancienne variante prend sa place, les autres la suivent
  const [plusAncienne, ...autres] = (await variantesDe(store, row.id)).reverse();
  if (plusAncienne) {
    await store.updateRecipe(plusAncienne.id, { varianteDe: null });
    for (const v of autres) await store.updateRecipe(v.id, { varianteDe: plusAncienne.id });
  }
  return (await store.deleteRecipe(row.id)) ? ok(true) : fail("not_found");
}

export async function listPublished(store: Store, q = "", categorie?: string): Promise<RecipeRow[]> {
  return searchRecipes(await store.listRecipes({ status: "published" }), q, categorie);
}

export async function listPending(store: Store, viewer: Viewer): Promise<ServiceResult<RecipeRow[]>> {
  if (viewer.role !== "admin") return fail("forbidden");
  return ok(await store.listRecipes({ status: "pending" }));
}

export async function exportAll(store: Store, viewer: Viewer): Promise<ServiceResult<RecipeRow[]>> {
  if (viewer.role !== "admin") return fail("forbidden");
  return ok(await store.listRecipes());
}

import type { Viewer } from "./auth";
import { searchRecipes } from "./recipe/search";
import { MAX_PAYLOAD_BYTES, type Recipe } from "./recipe/types";
import type { RecipeRow, Store } from "./store/types";

export type ServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: "forbidden" | "not_found" | "rate_limited" | "too_large" };

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
  return viewer.role === "member" && viewer.profileId !== null && row.authorId === viewer.profileId;
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
    // un bloc renvoyé par Claude oublie souvent l'image : on garde celle qui existe
    const aGarder = !recipe.image && existante.recipe.image ? { ...recipe, image: existante.recipe.image } : recipe;
    const maj = await store.updateRecipe(existante.id, { recipe: aGarder });
    return maj ? ok(maj) : fail("not_found");
  }

  if (viewer.role === "visitor") {
    const depuis = new Date(now() - VISITOR_WINDOW_MS).toISOString();
    if ((await store.countSubmissions(ctx.ipHash, depuis)) >= VISITOR_LIMIT) return fail("rate_limited");
    const row = await store.insertRecipe({ status: "pending", authorId: null, recipe });
    await store.logSubmission(ctx.ipHash, new Date(now()).toISOString());
    return ok(row);
  }
  return ok(await store.insertRecipe({ status: "published", authorId: viewer.profileId, recipe }));
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

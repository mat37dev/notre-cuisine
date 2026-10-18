import { json, originOf, viewerFromRequest } from "@/lib/http";
import { removeRecipe } from "@/lib/service";
import { getStore } from "@/lib/store";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const row = await getStore().getRecipe(id);
  if (!row || row.status !== "published") return json({ erreur: "Recette introuvable." }, 404);
  return json({ ...row.recipe, id: row.id, slug: row.slug, lien: `${originOf(request)}/recettes/${row.slug}` });
}

/** Supprime une recette : son auteur (membre) ou l'admin. */
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const store = getStore();
  const res = await removeRecipe(store, await viewerFromRequest(request, store), id);
  if (res.ok) return json({ ok: true });
  return res.code === "not_found"
    ? json({ erreur: "Recette introuvable." }, 404)
    : json({ erreur: "Tu n'as pas le droit de supprimer cette recette." }, 403);
}

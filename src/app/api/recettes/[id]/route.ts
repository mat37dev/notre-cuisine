import { json, originOf } from "@/lib/http";
import { getStore } from "@/lib/store";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const row = await getStore().getRecipe(id);
  if (!row || row.status !== "published") return json({ erreur: "Recette introuvable." }, 404);
  return json({ ...row.recipe, id: row.id, slug: row.slug, lien: `${originOf(request)}/recettes/${row.slug}` });
}

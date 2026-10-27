import { VISITOR } from "@/lib/auth";
import { json, originOf, refusJeton, viewerFromRequest } from "@/lib/http";
import { listerGroupe, removeRecipe } from "@/lib/service";
import { getStore } from "@/lib/store";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const store = getStore();
  const row = await store.getRecipe(id);
  if (!row || row.status !== "published") return json({ erreur: "Recette introuvable." }, 404);
  const origine = originOf(request);
  const groupe = await listerGroupe(store, VISITOR, row);
  const reference = row.varianteDe ? groupe.find((r) => r.id === row.varianteDe) : undefined;
  return json({
    ...row.recipe,
    id: row.id,
    slug: row.slug,
    lien: `${origine}/recettes/${row.slug}`,
    ...(reference && { variante_de: reference.slug }),
    variantes: groupe
      .filter((r) => r.id !== row.id)
      .map((r) => ({
        id: r.id,
        slug: r.slug,
        titre: r.recipe.titre,
        ...(r.recipe.nom_variante && { nom_variante: r.recipe.nom_variante }),
        lien: `${origine}/recettes/${r.slug}`,
      })),
  });
}

/** Supprime une recette : son auteur (membre) ou l'admin. */
export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const store = getStore();
  const viewer = await viewerFromRequest(request, store);
  const refus = refusJeton(viewer);
  if (refus) return refus;
  const res = await removeRecipe(store, viewer, id);
  if (res.ok) return json({ ok: true });
  return res.code === "not_found"
    ? json({ erreur: "Recette introuvable." }, 404)
    : json({ erreur: "Tu n'as pas le droit de supprimer cette recette." }, 403);
}

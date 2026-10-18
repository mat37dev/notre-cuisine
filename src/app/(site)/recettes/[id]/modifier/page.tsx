import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { RecipeEditor } from "@/components/RecipeEditor";
import { canEdit } from "@/lib/service";
import { getCurrentViewer } from "@/lib/session";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Modifier la recette" };

export default async function PageModifier({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row, viewer] = await Promise.all([getStore().getRecipe(id), getCurrentViewer()]);
  if (!row || !canEdit(viewer, row)) notFound();
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <BackLink repli={`/recettes/${row.slug}`} libelle="Retour à la recette" />
      <h1 className="titre text-3xl">Modifier « {row.recipe.titre} »</h1>
      <RecipeEditor recipe={row.recipe} slug={row.slug} />
    </main>
  );
}

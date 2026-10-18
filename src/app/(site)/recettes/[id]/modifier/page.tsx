import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">Modifier « {row.recipe.titre} »</h1>
      <RecipeEditor recipe={row.recipe} slug={row.slug} />
    </main>
  );
}

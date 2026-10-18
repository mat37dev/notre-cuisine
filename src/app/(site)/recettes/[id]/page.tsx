import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/AdminActions";
import { CopyButton } from "@/components/CopyButton";
import { RecipeView } from "@/components/RecipeView";
import { buildEditPrompt } from "@/lib/recipe/prompts";
import { canEdit, canView } from "@/lib/service";
import { getCurrentViewer } from "@/lib/session";
import { getStore } from "@/lib/store";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const row = await getStore().getRecipe(id);
  return { title: row?.status === "published" ? row.recipe.titre : "Recette" };
}

export default async function PageRecette({ params }: Props) {
  const { id } = await params;
  const store = getStore();
  const [row, viewer] = await Promise.all([store.getRecipe(id), getCurrentViewer()]);
  if (!row || !canView(viewer, row)) notFound();

  const auteur = row.authorId ? (await store.getProfile(row.authorId))?.name : null;
  const modifiable = canEdit(viewer, row);

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      {row.status === "pending" && (
        <p className="rounded-lg bg-amber-100 p-3 text-amber-950 dark:bg-amber-950 dark:text-amber-100">
          Cette recette est en attente de validation : elle n’apparaît pas encore sur la liste.
        </p>
      )}
      <RecipeView recipe={row.recipe} />
      <footer className="space-y-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        {auteur && <p className="text-sm text-neutral-500">Ajoutée par {auteur}</p>}
        {modifiable && (
          <div className="flex flex-wrap gap-2">
            <CopyButton text={buildEditPrompt(row)} label="Modifier avec Claude" />
            <Link
              href={`/recettes/${row.slug}/modifier`}
              className="rounded-lg border border-neutral-400 px-4 py-2 font-medium"
            >
              Modifier ici
            </Link>
            <ActionButton
              url={`/api/recettes/${row.id}`}
              method="DELETE"
              label="Supprimer"
              style="danger"
              confirm="Supprimer cette recette pour de bon ?"
              then="/"
            />
          </div>
        )}
      </footer>
    </main>
  );
}

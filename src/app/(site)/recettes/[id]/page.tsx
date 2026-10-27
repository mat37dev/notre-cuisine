import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/AdminActions";
import { BackLink } from "@/components/BackLink";
import { CopyButton } from "@/components/CopyButton";
import { RecipeView } from "@/components/RecipeView";
import { VariantPills, type Version } from "@/components/VariantPills";
import { buildEditPrompt, buildVariantPrompt } from "@/lib/recipe/prompts";
import { canEdit, canView, listerGroupe, racineDe } from "@/lib/service";
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

  const groupe = await listerGroupe(store, viewer, row);
  const noms = new Map(
    await Promise.all(
      [...new Set(groupe.map((r) => r.authorId).filter((a) => a !== null))].map(
        async (a) => [a, (await store.getProfile(a))?.name ?? null] as const,
      ),
    ),
  );
  const racine = racineDe(row);
  const versions: Version[] = groupe.map((r) => ({
    slug: r.slug,
    titre: r.recipe.titre,
    nomVariante: r.recipe.nom_variante ?? undefined,
    image: r.recipe.image,
    categorie: r.recipe.categorie,
    auteur: r.authorId ? (noms.get(r.authorId) ?? null) : null,
    originale: r.id === racine,
  }));
  // la référence peut être en attente, donc absente des pastilles : « Modifier avec Claude » doit quand même la garder
  const reference = row.varianteDe ? await store.getRecipe(row.varianteDe) : null;

  const auteur = row.authorId ? noms.get(row.authorId) : null;
  const modifiable = canEdit(viewer, row);
  const promptVariante = buildVariantPrompt(row);

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 py-6">
      <BackLink />
      {row.status === "pending" && (
        <p className="info">
          Cette recette est en attente de validation : elle n’apparaît pas encore sur la liste.
        </p>
      )}
      <RecipeView
        recipe={row.recipe}
        entete={<VariantPills versions={versions} courante={row.slug} promptVariante={promptVariante} />}
      />
      <footer className="space-y-3 border-t border-ligne pt-5">
        {auteur && <p className="text-sm text-muted">Ajoutée par {auteur}</p>}
        <div className="flex flex-wrap gap-2">
          {modifiable && (
            <>
              <CopyButton text={buildEditPrompt(row, reference?.slug)} label="Modifier avec Claude" />
              <Link href={`/recettes/${row.slug}/modifier`} className="btn btn-secondary">
                Modifier ici
              </Link>
            </>
          )}
          <CopyButton text={promptVariante} label="＋ Proposer une variante" base="btn btn-variante" />
          {modifiable && (
            <ActionButton
              url={`/api/recettes/${row.id}`}
              method="DELETE"
              label="Supprimer"
              style="danger"
              confirm="Supprimer cette recette pour de bon ?"
              then="/"
            />
          )}
        </div>
      </footer>
    </main>
  );
}

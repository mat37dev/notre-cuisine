import { RecipeGrid } from "@/components/RecipeGrid";
import { listPublished } from "@/lib/service";
import { getStore } from "@/lib/store";

type Props = { searchParams: Promise<{ q?: string; categorie?: string }> };

export default async function Accueil({ searchParams }: Props) {
  const { q = "", categorie } = await searchParams;
  const rows = await listPublished(getStore());

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <section className="space-y-3 text-center">
        <h1 className="titre text-4xl sm:text-5xl">Qu’est-ce qu’on mange ?</h1>
        <p className="mx-auto max-w-xl text-muted">Toutes nos recettes, au même endroit, à portée de main en cuisine.</p>
      </section>
      <RecipeGrid rows={rows} qInitial={q} categorieInitiale={categorie} />
    </main>
  );
}

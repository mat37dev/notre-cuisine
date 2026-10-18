import { BandeauBienvenue } from "@/components/BandeauBienvenue";
import { RecipeGrid } from "@/components/RecipeGrid";
import { listPublished } from "@/lib/service";
import { getCurrentViewer } from "@/lib/session";
import { getStore } from "@/lib/store";

type Props = { searchParams: Promise<{ q?: string; categorie?: string; bienvenue?: string }> };

export default async function Accueil({ searchParams }: Props) {
  const { q = "", categorie, bienvenue } = await searchParams;
  const rows = await listPublished(getStore());
  const viewer = bienvenue ? await getCurrentViewer() : null; // le message n'a de sens que pour un appareil reconnu

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      {viewer?.name && <BandeauBienvenue nom={viewer.name} />}
      <section className="space-y-3 text-center">
        <h1 className="titre text-4xl sm:text-5xl">Qu’est-ce qu’on mange ?</h1>
        <p className="mx-auto max-w-xl text-muted">Toutes nos recettes, au même endroit, à portée de main en cuisine.</p>
      </section>
      <RecipeGrid rows={rows} qInitial={q} categorieInitiale={categorie} />
    </main>
  );
}

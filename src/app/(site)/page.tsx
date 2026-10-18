import Link from "next/link";
import { RecipeArt } from "@/components/RecipeArt";
import { EMOJIS_CATEGORIES, LIBELLES_CATEGORIES } from "@/lib/recipe/labels";
import { CATEGORIES } from "@/lib/recipe/types";
import { listPublished } from "@/lib/service";
import { getStore } from "@/lib/store";

type Props = { searchParams: Promise<{ q?: string; categorie?: string }> };

export default async function Accueil({ searchParams }: Props) {
  const { q = "", categorie } = await searchParams;
  const rows = await listPublished(getStore(), q, categorie);
  const href = (cat?: string) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (cat) p.set("categorie", cat);
    const s = p.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <section className="space-y-4 text-center">
        <h1 className="titre text-4xl sm:text-5xl">Qu’est-ce qu’on mange ?</h1>
        <p className="mx-auto max-w-xl text-muted">Toutes nos recettes, au même endroit, à portée de main en cuisine.</p>
        <form action="/" className="mx-auto flex max-w-xl gap-2">
          {categorie && <input type="hidden" name="categorie" value={categorie} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Une recette, un ingrédient…"
            aria-label="Chercher"
            className="champ"
          />
          <button type="submit" className="btn btn-primary">
            Chercher
          </button>
        </form>
      </section>

      <nav aria-label="Catégories" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:justify-center">
        <Link href={href()} className="puce" aria-current={!categorie}>
          Toutes
        </Link>
        {CATEGORIES.map((c) => (
          <Link key={c} href={href(c)} className="puce" aria-current={categorie === c}>
            <span aria-hidden>{EMOJIS_CATEGORIES[c]}</span> {LIBELLES_CATEGORIES[c]}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className="carte mx-auto max-w-md space-y-3 p-8 text-center">
          <p className="text-5xl" aria-hidden>
            🍳
          </p>
          <p className="text-muted">
            {q || categorie ? "Aucune recette ne correspond." : "Pas encore de recette. Ajoute la première !"}
          </p>
          {!q && !categorie && (
            <Link href="/ajouter" className="btn btn-primary">
              Ajouter une recette
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/recettes/${row.slug}`}
                className="carte group block h-full overflow-hidden transition hover:-translate-y-0.5 hover:border-brand"
              >
                <RecipeArt
                  image={row.recipe.image}
                  titre={row.recipe.titre}
                  categorie={row.recipe.categorie}
                  className="transition duration-300 group-hover:scale-[1.03]"
                />
                <div className="space-y-1.5 p-4">
                  <span className="badge">
                    <span aria-hidden>{EMOJIS_CATEGORIES[row.recipe.categorie]}</span>
                    {LIBELLES_CATEGORIES[row.recipe.categorie]}
                  </span>
                  <h2 className="titre text-xl">{row.recipe.titre}</h2>
                  {row.recipe.description && (
                    <p className="line-clamp-2 text-sm text-muted">{row.recipe.description}</p>
                  )}
                  <p className="text-sm font-semibold text-herbe">
                    Pour {row.recipe.portions} {row.recipe.portions > 1 ? "personnes" : "personne"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

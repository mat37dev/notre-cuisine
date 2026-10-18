import Link from "next/link";
import { LIBELLES_CATEGORIES } from "@/lib/recipe/labels";
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
  const puce = (actif: boolean) =>
    `whitespace-nowrap rounded-full border px-4 py-2 text-sm ${
      actif ? "border-orange-600 bg-orange-600 text-white" : "border-neutral-300 dark:border-neutral-700"
    }`;

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <form action="/" className="flex gap-2">
        {categorie && <input type="hidden" name="categorie" value={categorie} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Chercher une recette ou un ingrédient"
          aria-label="Chercher"
          className="min-h-11 flex-1 rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700"
        />
        <button type="submit" className="min-h-11 rounded-lg bg-orange-600 px-4 font-medium text-white">
          Chercher
        </button>
      </form>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <Link href={href()} className={puce(!categorie)}>
          Toutes
        </Link>
        {CATEGORIES.map((c) => (
          <Link key={c} href={href(c)} className={puce(categorie === c)}>
            {LIBELLES_CATEGORIES[c]}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-neutral-500">
          {q || categorie ? "Aucune recette ne correspond." : "Pas encore de recette. "}
          {!q && !categorie && (
            <Link href="/ajouter" className="underline">
              Ajoute la première !
            </Link>
          )}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/recettes/${row.slug}`}
                className="block h-full rounded-xl border border-neutral-200 p-4 hover:border-orange-600 dark:border-neutral-800"
              >
                <span className="text-xs font-medium uppercase tracking-wide text-orange-700 dark:text-orange-300">
                  {LIBELLES_CATEGORIES[row.recipe.categorie]}
                </span>
                <h2 className="text-lg font-semibold">{row.recipe.titre}</h2>
                {row.recipe.description && (
                  <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
                    {row.recipe.description}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

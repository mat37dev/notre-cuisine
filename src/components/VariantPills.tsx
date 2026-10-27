import Link from "next/link";
import { EMOJIS_CATEGORIES } from "@/lib/recipe/labels";
import type { Categorie } from "@/lib/recipe/types";
import { CopyButton } from "./CopyButton";

/** Une recette du plat, telle qu'elle apparaît dans sa pastille. */
export type Version = {
  slug: string;
  titre: string;
  nomVariante?: string;
  image?: string;
  categorie: Categorie;
  /** Prénom de la personne qui l'a ajoutée, s'il est connu. */
  auteur: string | null;
  /** La recette de référence du plat. */
  originale: boolean;
};

function Vignette({ version }: { version: Version }) {
  if (version.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={version.image}
        alt=""
        referrerPolicy="no-referrer"
        className="size-6 shrink-0 rounded-full border border-ligne object-cover"
      />
    );
  }
  return (
    <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-doux text-sm">
      {EMOJIS_CATEGORIES[version.categorie]}
    </span>
  );
}

/**
 * Rangée de pastilles qui relie les versions d'un même plat (l'originale et ses variantes), sous le titre de la recette.
 * Rien n'est affiché pour une recette seule.
 */
export function VariantPills({
  versions,
  courante,
  promptVariante,
}: {
  versions: Version[];
  /** Slug de la recette affichée. */
  courante: string;
  /** Message à copier pour demander une variante à Claude. */
  promptVariante: string;
}) {
  if (versions.length < 2) return null;
  return (
    <div className="space-y-2 border-t border-dashed border-ligne bg-[color-mix(in_srgb,var(--beurre)_35%,var(--papier))] px-5 py-3">
      <p className="text-sm font-extrabold">
        <span aria-hidden>🍽️ </span>
        {versions.length} façons de faire ce plat
      </p>
      <nav aria-label="Versions de ce plat" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {versions.map((v) => {
          const contenu = (
            <>
              <Vignette version={v} />
              <span data-nom>{v.nomVariante || v.titre}</span>
              {(v.originale || v.auteur) && (
                <span className="text-xs font-semibold opacity-75">· {v.originale ? "originale" : v.auteur}</span>
              )}
            </>
          );
          return v.slug === courante ? (
            <span key={v.slug} data-testid="pastille-version" aria-current="true" className="puce !pl-1.5">
              {contenu}
            </span>
          ) : (
            <Link key={v.slug} href={`/recettes/${v.slug}`} data-testid="pastille-version" className="puce !pl-1.5">
              {contenu}
            </Link>
          );
        })}
        <CopyButton text={promptVariante} label="＋" ariaLabel="Proposer une variante" base="puce puce-plus" />
      </nav>
    </div>
  );
}

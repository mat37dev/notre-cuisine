import Link from "next/link";
import type { CSSProperties } from "react";
import { EMOJIS_CATEGORIES, LIBELLES_CATEGORIES } from "@/lib/recipe/labels";
import type { PlatAffiche } from "@/lib/recipe/plats";
import type { RecipeRow } from "@/lib/store/types";
import { RecipeArt } from "./RecipeArt";

/** Fiches montrées derrière la carte : au-delà, « N versions » suffit. */
const FICHES_MAX = 2;
/** Noms des autres versions écrits sur la carte : au-delà, « +N ». */
const NOMS_MAX = 2;

const nomDe = (r: RecipeRow) => r.recipe.nom_variante || r.recipe.titre;

/**
 * Carte d'un plat sur l'accueil. Un plat qui a plusieurs versions est présenté comme une pile de fiches, avec le nom
 * des autres versions écrit sur la carte ; sur ordinateur, les fiches s'ouvrent en éventail au survol.
 * Une recette seule garde la carte habituelle.
 */
export function PlatCard({ plat, index }: { plat: PlatAffiche; index: number }) {
  const { carte, autres, total } = plat;
  const fiches = autres.slice(0, FICHES_MAX);
  const enPile = total > 1;

  const lien = (
    <Link
      href={`/recettes/${carte.slug}`}
      className={`carte group block h-full overflow-hidden transition hover:-translate-y-0.5 hover:border-brand ${enPile ? "devant" : ""}`}
    >
      <RecipeArt
        image={carte.recipe.image}
        titre={carte.recipe.titre}
        categorie={carte.recipe.categorie}
        className="transition duration-300 group-hover:scale-[1.03]"
      />
      <div className="space-y-1.5 p-4">
        <span className="badge">
          <span aria-hidden>{EMOJIS_CATEGORIES[carte.recipe.categorie]}</span>
          {LIBELLES_CATEGORIES[carte.recipe.categorie]}
        </span>
        <h2 className="titre text-xl">{carte.recipe.titre}</h2>
        {carte.recipe.description && <p className="line-clamp-2 text-sm text-muted">{carte.recipe.description}</p>}
        <p className="text-sm font-semibold text-herbe">
          Pour {carte.recipe.portions} {carte.recipe.portions > 1 ? "personnes" : "personne"}
        </p>
        {enPile && (
          <div className="space-y-1.5">
            <p className="text-sm font-extrabold text-brand-fort">
              <span aria-hidden>🍽️ </span>
              {total} versions
            </p>
            <ul aria-label="Autres versions" className="flex flex-wrap gap-1">
              {autres.slice(0, NOMS_MAX).map((r) => (
                <li key={r.id} data-nom-version className="rounded-full bg-brand-doux px-2 text-xs font-bold text-brand-fort">
                  {nomDe(r)}
                </li>
              ))}
              {autres.length > NOMS_MAX && (
                <li className="rounded-full bg-brand-doux px-2 text-xs font-bold text-brand-fort">
                  +{autres.length - NOMS_MAX}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </Link>
  );

  return (
    <li className="carte-liste" style={{ viewTransitionName: `carte-${carte.id}`, "--i": Math.min(index, 12) } as CSSProperties}>
      {enPile ? (
        <div className="pile">
          {fiches.map((r, i) => (
            <div key={r.id} aria-hidden className={`carte feuille f${i + 1}`}>
              <RecipeArt image={r.recipe.image} titre="" categorie={r.recipe.categorie} className="!aspect-auto h-full" />
              <span className="tranche">{nomDe(r)}</span>
            </div>
          ))}
          {lien}
        </div>
      ) : (
        lien
      )}
    </li>
  );
}

"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { EMOJIS_CATEGORIES } from "@/lib/recipe/labels";
import type { Categorie } from "@/lib/recipe/types";

/** Une recette du plat, telle qu'elle apparaît dans la liste des versions. */
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

/** Vignettes montrées sur le bouton du menu fermé. */
const VIGNETTES_MAX = 3;

function Vignette({ version, className = "" }: { version: Version; className?: string }) {
  if (version.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={version.image}
        alt=""
        referrerPolicy="no-referrer"
        className={`shrink-0 rounded-full border border-ligne object-cover ${className}`}
      />
    );
  }
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full bg-brand-doux ${className}`}>
      {EMOJIS_CATEGORIES[version.categorie]}
    </span>
  );
}

/** Le petit texte sous le nom (téléphone) ou à sa suite (ordinateur). */
function Detail({ version, courante }: { version: Version; courante: boolean }) {
  const surTelephone = courante
    ? "Tu la regardes"
    : version.originale
      ? "Originale"
      : version.auteur && `par ${version.auteur}`;
  const surOrdinateur = version.originale ? "originale" : version.auteur;
  return (
    <>
      {surTelephone && (
        <span
          className={`block text-xs font-bold sm:hidden ${courante ? "text-brand-fort" : version.originale ? "text-herbe" : "text-muted"}`}
        >
          {surTelephone}
        </span>
      )}
      {surOrdinateur && <span className="hidden text-xs font-semibold opacity-75 sm:inline"> · {surOrdinateur}</span>}
    </>
  );
}

/**
 * Les versions d'un même plat (l'originale et ses variantes), sous le titre de la recette.
 * Sur téléphone, un menu fermé par défaut qui se déroule en liste ; sur ordinateur, une rangée de pastilles.
 * Rien n'est affiché pour une recette seule.
 */
export function VariantPills({
  versions,
  courante,
}: {
  versions: Version[];
  /** Slug de la recette affichée. */
  courante: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  if (versions.length < 2) return null;
  const titre = `${versions.length} façons de faire ce plat`;

  return (
    <div className="border-t border-dashed border-ligne bg-[color-mix(in_srgb,var(--beurre)_35%,var(--papier))] px-5 py-3">
      <p className="mb-2 hidden text-sm font-extrabold sm:block">
        <span aria-hidden>🍽️ </span>
        {titre}
      </p>
      <button
        type="button"
        aria-expanded={ouvert}
        aria-controls={id}
        onClick={() => setOuvert((o) => !o)}
        className="flex min-h-11 w-full items-center gap-2 text-left text-sm font-extrabold sm:hidden"
      >
        <span aria-hidden>🍽️</span>
        {/* plus court que sur ordinateur, pour tenir sur une ligne à côté des vignettes et de « Voir » */}
        <span className="flex-1">{versions.length} versions de ce plat</span>
        <span aria-hidden className="flex">
          {versions.slice(0, VIGNETTES_MAX).map((v) => (
            <Vignette key={v.slug} version={v} className="-ml-1.5 size-6 border-2 border-papier text-xs first:ml-0" />
          ))}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-ligne bg-papier py-1 pr-2 pl-3 text-xs font-bold">
          {ouvert ? "Fermer" : "Voir"}
          <svg aria-hidden viewBox="0 0 20 20" className={`size-4 transition-transform ${ouvert ? "rotate-180" : ""}`}>
            <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      <nav id={id} aria-label="Versions de ce plat" className={`versions ${ouvert ? "ouvert" : ""}`}>
        {versions.map((v) => {
          const estCourante = v.slug === courante;
          const contenu = (
            <>
              <Vignette version={v} className="size-8 text-base sm:size-6 sm:text-sm" />
              <span className="min-w-0 flex-1 sm:flex-none">
                <span data-nom className="block truncate font-extrabold sm:inline sm:font-semibold">
                  {v.nomVariante || v.titre}
                </span>
                <Detail version={v} courante={estCourante} />
              </span>
              {!estCourante && (
                <span aria-hidden className="text-xl leading-none text-muted sm:hidden">
                  ›
                </span>
              )}
            </>
          );
          return estCourante ? (
            <span key={v.slug} data-testid="pastille-version" aria-current="true" className="version">
              {contenu}
            </span>
          ) : (
            <Link
              key={v.slug}
              href={`/recettes/${v.slug}`}
              data-testid="pastille-version"
              className="version"
              onClick={() => setOuvert(false)}
            >
              {contenu}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

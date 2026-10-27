"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type TouchEvent } from "react";
import { EMOJIS_CATEGORIES, LIBELLES_CATEGORIES } from "@/lib/recipe/labels";
import type { PlatAffiche } from "@/lib/recipe/plats";
import type { RecipeRow } from "@/lib/store/types";
import { RecipeArt } from "./RecipeArt";

/** Durée de l'appui long qui ouvre l'éventail sur téléphone. */
const APPUI_LONG_MS = 400;
/** Au-delà de ce déplacement du doigt, c'est un défilement, pas un appui long. */
const TOLERANCE_PX = 10;
/** Fiches montrées derrière la carte : au-delà, « N versions » suffit. */
const FICHES_MAX = 2;

const nomDe = (r: RecipeRow) => r.recipe.nom_variante || r.recipe.titre;

/**
 * Carte d'un plat sur l'accueil. Un plat qui a plusieurs versions est présenté comme une pile de fiches :
 * au survol (ordinateur) ou à l'appui long (téléphone), les fiches s'ouvrent en éventail et montrent la photo
 * et le nom des autres versions. Une recette seule garde la carte habituelle.
 */
export function PlatCard({ plat, index }: { plat: PlatAffiche; index: number }) {
  const { carte, autres, total } = plat;
  const fiches = autres.slice(0, FICHES_MAX);
  const enPile = total > 1;

  const [ouvert, setOuvert] = useState(false);
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const depart = useRef<{ x: number; y: number } | null>(null);
  const appuiLongFait = useRef(false);

  const annuler = () => {
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = null;
  };
  useEffect(() => annuler, []);

  const touchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    depart.current = t ? { x: t.clientX, y: t.clientY } : null;
    appuiLongFait.current = false;
    annuler();
    minuterie.current = setTimeout(() => {
      appuiLongFait.current = true;
      setOuvert(true);
      navigator.vibrate?.(10);
    }, APPUI_LONG_MS);
  };
  const touchMove = (e: TouchEvent) => {
    const t = e.touches[0];
    if (!t || !depart.current) return;
    if (Math.hypot(t.clientX - depart.current.x, t.clientY - depart.current.y) > TOLERANCE_PX) annuler();
  };
  const touchEnd = () => {
    annuler();
    setOuvert(false);
  };

  const lien = (
    <Link
      href={`/recettes/${carte.slug}`}
      className={`carte group block h-full overflow-hidden transition hover:-translate-y-0.5 hover:border-brand ${enPile ? "devant" : ""}`}
      onClick={(e) => {
        // le relâchement d'un appui long ne doit pas ouvrir la recette
        if (appuiLongFait.current) {
          e.preventDefault();
          appuiLongFait.current = false;
        }
      }}
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
          <p className="flex items-center gap-1.5 text-sm font-extrabold text-brand-fort">
            <span aria-hidden>🍽️</span>
            <span>{total} versions</span>
            <span className="flex">
              {fiches.map((r) => (
                <Vignette key={r.id} row={r} />
              ))}
            </span>
            <span className="sr-only">Autres versions : {autres.map(nomDe).join(", ")}</span>
          </p>
        )}
      </div>
    </Link>
  );

  return (
    <li className="carte-liste" style={{ viewTransitionName: `carte-${carte.id}`, "--i": Math.min(index, 12) } as CSSProperties}>
      {enPile ? (
        <div
          className={`pile ${ouvert ? "ouvert" : ""}`}
          onTouchStart={touchStart}
          onTouchMove={touchMove}
          onTouchEnd={touchEnd}
          onTouchCancel={touchEnd}
          onContextMenu={(e) => e.preventDefault()}
        >
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

function Vignette({ row }: { row: RecipeRow }) {
  const classes = "-ml-1 size-5 rounded-full border-2 border-papier first:ml-0";
  if (row.recipe.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img data-vignette src={row.recipe.image} alt="" referrerPolicy="no-referrer" className={`${classes} object-cover`} />;
  }
  return (
    <span data-vignette aria-hidden className={`${classes} flex items-center justify-center bg-brand-doux text-[0.6rem]`}>
      {EMOJIS_CATEGORIES[row.recipe.categorie]}
    </span>
  );
}

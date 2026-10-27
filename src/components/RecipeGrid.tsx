"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { EMOJIS_CATEGORIES, LIBELLES_CATEGORIES } from "@/lib/recipe/labels";
import { platsAffiches } from "@/lib/recipe/plats";
import { CATEGORIES } from "@/lib/recipe/types";
import type { RecipeRow } from "@/lib/store/types";
import { PlatCard } from "./PlatCard";

type Tri = "recentes" | "az";

/**
 * Applique un changement d'affichage avec une transition animée du navigateur : les cartes glissent vers leur
 * nouvelle place, apparaissent ou disparaissent en fondu. Sans cette fonction du navigateur, ou si la personne a
 * demandé de réduire les animations, le changement se fait simplement sans animation.
 */
function avecTransition(changement: () => void) {
  const reduire = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const demarrer = (document as Document & { startViewTransition?: (rappel: () => void) => unknown }).startViewTransition;
  if (!demarrer || reduire) {
    changement();
    return;
  }
  const transition = demarrer.call(document, () => flushSync(changement)) as
    | { ready?: Promise<unknown>; finished?: Promise<unknown>; updateCallbackDone?: Promise<unknown> }
    | undefined;
  // Le navigateur annule parfois une transition (onglet masqué, page qui change) : ce n'est pas une erreur,
  // l'affichage est déjà à jour. Sans ces « catch », la console affiche une erreur à chaque annulation.
  for (const promesse of [transition?.ready, transition?.finished, transition?.updateCallbackDone]) {
    promesse?.catch(() => {});
  }
}

function suivreDansLAdresse(q: string, categorie?: string) {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (categorie) p.set("categorie", categorie);
  const texte = p.toString();
  window.history.replaceState(null, "", texte ? `?${texte}` : window.location.pathname);
}

export function RecipeGrid({
  rows,
  qInitial = "",
  categorieInitiale,
}: {
  rows: RecipeRow[];
  qInitial?: string;
  categorieInitiale?: string;
}) {
  const [q, setQ] = useState(qInitial);
  const [categorie, setCategorie] = useState<string | undefined>(categorieInitiale);
  const [tri, setTri] = useState<Tri>("recentes");

  const visibles = useMemo(() => {
    // une carte par plat : ses variantes sont présentées avec elle
    const plats = platsAffiches(rows, q, categorie);
    return tri === "az"
      ? [...plats].sort((a, b) => a.carte.recipe.titre.localeCompare(b.carte.recipe.titre, "fr", { sensitivity: "base" }))
      : plats;
  }, [rows, q, categorie, tri]);

  const choisirCategorie = (c?: string) =>
    avecTransition(() => {
      setCategorie(c);
      suivreDansLAdresse(q, c);
    });

  return (
    <div className="space-y-6">
      <form action="/" role="search" onSubmit={(e) => e.preventDefault()} className="mx-auto flex max-w-xl gap-2">
        {categorie && <input type="hidden" name="categorie" value={categorie} />}
        <input
          type="search"
          name="q"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            suivreDansLAdresse(e.target.value, categorie);
          }}
          placeholder="Une recette, un ingrédient…"
          aria-label="Chercher"
          className="champ"
        />
      </form>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <nav aria-label="Catégories" className="-mx-4 flex max-w-[100vw] gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <button type="button" className="puce" aria-pressed={!categorie} onClick={() => choisirCategorie(undefined)}>
            Toutes
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className="puce"
              aria-pressed={categorie === c}
              onClick={() => choisirCategorie(c)}
            >
              <span aria-hidden>{EMOJIS_CATEGORIES[c]}</span> {LIBELLES_CATEGORIES[c]}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <p role="status" aria-live="polite" className="text-muted">
            {visibles.length} {visibles.length > 1 ? "recettes" : "recette"}
          </p>
          <select
            aria-label="Trier"
            value={tri}
            onChange={(e) => avecTransition(() => setTri(e.target.value as Tri))}
            className="champ !min-h-10 !w-auto !py-1 font-semibold"
          >
            <option value="recentes">Plus récentes</option>
            <option value="az">A → Z</option>
          </select>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="carte mx-auto max-w-md space-y-3 p-8 text-center">
          <p className="text-5xl" aria-hidden>
            🍳
          </p>
          <p className="text-muted">Pas encore de recette. Ajoute la première !</p>
          <Link href="/ajouter" className="btn btn-primary">
            Ajouter une recette
          </Link>
        </div>
      ) : visibles.length === 0 ? (
        <div className="carte mx-auto max-w-md space-y-3 p-8 text-center">
          <p className="text-5xl" aria-hidden>
            🔍
          </p>
          <p className="text-muted">Aucune recette ne correspond.</p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              avecTransition(() => {
                setQ("");
                setCategorie(undefined);
                suivreDansLAdresse("", undefined);
              })
            }
          >
            Tout afficher
          </button>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((plat, i) => (
            <PlatCard key={plat.carte.id} plat={plat} index={i} />
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { EMOJIS_CATEGORIES, LIBELLES_CATEGORIES } from "@/lib/recipe/labels";
import { formatQuantity, renderStepText } from "@/lib/recipe/scale";
import type { Recipe } from "@/lib/recipe/types";
import { RecipeArt } from "./RecipeArt";
import { TimerChip } from "./TimerChip";

const MIN_PERSONNES = 1;
const MAX_PERSONNES = 50;
const borner = (n: number) => Math.min(MAX_PERSONNES, Math.max(MIN_PERSONNES, Math.round(n)));

export function RecipeView({ recipe }: { recipe: Recipe }) {
  const [personnes, setPersonnes] = useState(() => borner(recipe.portions));
  const rond =
    "flex size-12 items-center justify-center rounded-full border border-ligne bg-papier text-2xl font-bold " +
    "hover:border-brand disabled:opacity-30";

  return (
    <article className="space-y-6">
      <div className="carte overflow-hidden">
        <RecipeArt
          image={recipe.image}
          titre={recipe.titre}
          categorie={recipe.categorie}
          className="md:aspect-[21/9]"
          eager
        />
        <header className="space-y-2 p-5">
          <span className="badge">
            <span aria-hidden>{EMOJIS_CATEGORIES[recipe.categorie]}</span>
            {LIBELLES_CATEGORIES[recipe.categorie]}
          </span>
          <h1 className="titre text-3xl sm:text-4xl">{recipe.titre}</h1>
          {recipe.description && <p className="text-lg text-muted">{recipe.description}</p>}
        </header>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <div className="space-y-6 lg:sticky lg:top-20">
          <div className="carte flex items-center justify-between gap-3 p-4">
            <span className="font-bold">Pour</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className={rond}
                aria-label="Moins de personnes"
                disabled={personnes <= MIN_PERSONNES}
                onClick={() => setPersonnes((n) => borner(n - 1))}
              >
                −
              </button>
              <output aria-label="Nombre de personnes" className="titre min-w-10 text-center text-3xl">
                {personnes}
              </output>
              <button
                type="button"
                className={rond}
                aria-label="Plus de personnes"
                disabled={personnes >= MAX_PERSONNES}
                onClick={() => setPersonnes((n) => borner(n + 1))}
              >
                +
              </button>
            </div>
            <span className="font-bold">{personnes > 1 ? "personnes" : "personne"}</span>
          </div>

          <section className="carte p-5">
            <h2 className="titre mb-3 text-2xl">Ingrédients</h2>
            <ul>
              {recipe.ingredients.map((ing) => {
                const quantite = formatQuantity(ing.quantite, ing.unite, recipe.portions, personnes);
                return (
                  <li key={ing.id} className="flex gap-3 border-b border-dashed border-ligne py-2 last:border-b-0">
                    <span className="min-w-20 font-bold text-brand">{quantite || "au goût"}</span>
                    <span>{ing.nom}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <section className="carte p-5">
            <h2 className="titre mb-4 text-2xl">Étapes</h2>
            <ol className="space-y-5">
              {recipe.etapes.map((etape, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand font-bold text-sur-brand">
                    {i + 1}
                  </span>
                  <div className="space-y-2 pt-0.5">
                    {etape.titre && <p className="titre text-lg">{etape.titre}</p>}
                    <p>{renderStepText(etape.texte, recipe.ingredients, recipe.portions, personnes)}</p>
                    {etape.chrono_secondes ? <TimerChip secondes={etape.chrono_secondes} /> : null}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {recipe.notes && (
            <p className="info">
              <span aria-hidden>💡 </span>
              {recipe.notes}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

"use client";

import { useState } from "react";
import { formatQuantity, renderStepText } from "@/lib/recipe/scale";
import type { Recipe } from "@/lib/recipe/types";
import { TimerChip } from "./TimerChip";

const MIN_PERSONNES = 1;
const MAX_PERSONNES = 50;
const borner = (n: number) => Math.min(MAX_PERSONNES, Math.max(MIN_PERSONNES, Math.round(n)));

export function RecipeView({ recipe }: { recipe: Recipe }) {
  const [personnes, setPersonnes] = useState(() => borner(recipe.portions));
  const bouton =
    "flex size-11 items-center justify-center rounded-full border border-neutral-400 text-2xl disabled:opacity-30";

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{recipe.titre}</h1>
        {recipe.description && <p className="text-neutral-600 dark:text-neutral-300">{recipe.description}</p>}
      </header>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className={bouton}
          aria-label="Moins de personnes"
          disabled={personnes <= MIN_PERSONNES}
          onClick={() => setPersonnes((n) => borner(n - 1))}
        >
          −
        </button>
        <output aria-label="Nombre de personnes" className="min-w-8 text-center text-2xl font-semibold">
          {personnes}
        </output>
        <button
          type="button"
          className={bouton}
          aria-label="Plus de personnes"
          disabled={personnes >= MAX_PERSONNES}
          onClick={() => setPersonnes((n) => borner(n + 1))}
        >
          +
        </button>
        <span>personnes</span>
      </div>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Ingrédients</h2>
        <ul className="space-y-1">
          {recipe.ingredients.map((ing) => {
            const quantite = formatQuantity(ing.quantite, ing.unite, recipe.portions, personnes);
            return (
              <li key={ing.id} className="flex gap-2">
                <span className="min-w-20 font-semibold">{quantite || "au goût"}</span>
                <span>{ing.nom}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Étapes</h2>
        <ol className="space-y-4">
          {recipe.etapes.map((etape, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-600 font-semibold text-white">
                {i + 1}
              </span>
              <div className="space-y-2">
                {etape.titre && <p className="font-semibold">{etape.titre}</p>}
                <p>{renderStepText(etape.texte, recipe.ingredients, recipe.portions, personnes)}</p>
                {etape.chrono_secondes ? <TimerChip secondes={etape.chrono_secondes} /> : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {recipe.notes && (
        <p className="rounded-lg bg-amber-100 p-3 text-amber-950 dark:bg-amber-950 dark:text-amber-100">
          <span aria-hidden>💡 </span>
          {recipe.notes}
        </p>
      )}
    </article>
  );
}

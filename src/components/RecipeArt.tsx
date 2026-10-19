"use client";

import { useState } from "react";
import { EMOJIS_CATEGORIES, TEINTES_CATEGORIES } from "@/lib/recipe/labels";
import type { Categorie } from "@/lib/recipe/types";

/**
 * Image d'une recette : sa photo si elle en a une, sinon un fond coloré avec l'emoji de sa catégorie.
 * Même rapport largeur/hauteur dans les deux cas : les cartes restent alignées.
 * Si la photo ne se charge pas (adresse choisie par Claude, introuvable ou bloquée), on retombe sur l'illustration.
 */
export function RecipeArt({
  image,
  titre,
  categorie,
  className = "",
  eager = false,
}: {
  image?: string;
  titre: string;
  categorie: Categorie;
  className?: string;
  eager?: boolean;
}) {
  const [adresseEnEchec, setAdresseEnEchec] = useState<string | null>(null);
  if (image && image !== adresseEnEchec) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={titre}
        loading={eager ? "eager" : "lazy"}
        referrerPolicy="no-referrer"
        onError={() => setAdresseEnEchec(image)}
        className={`aspect-[16/10] w-full object-cover ${className}`}
      />
    );
  }
  const teinte = TEINTES_CATEGORIES[categorie];
  return (
    <div
      aria-hidden
      className={`flex aspect-[16/10] w-full items-center justify-center text-6xl ${className}`}
      style={{
        backgroundImage: `radial-gradient(circle at 25% 20%, hsl(${teinte} 90% 94% / 0.95), transparent 55%), linear-gradient(135deg, hsl(${teinte} 75% 86%), hsl(${teinte} 70% 76%))`,
      }}
    >
      <span className="drop-shadow-sm">{EMOJIS_CATEGORIES[categorie]}</span>
    </div>
  );
}

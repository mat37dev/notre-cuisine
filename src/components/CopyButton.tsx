"use client";

import { useState } from "react";

type Etat = "repos" | "copie" | "echec";

/**
 * `base` remplace les classes du bouton principal (ex. "btn btn-variante").
 * `ariaLabel` nomme le bouton au repos quand son texte n'est qu'un symbole (« ＋ »).
 */
export function CopyButton({
  text,
  label,
  className = "",
  base = "btn btn-primary",
  ariaLabel,
}: {
  text: string;
  label: string;
  className?: string;
  base?: string;
  ariaLabel?: string;
}) {
  const [etat, setEtat] = useState<Etat>("repos");

  async function copier() {
    try {
      await navigator.clipboard.writeText(text);
      setEtat("copie");
    } catch {
      setEtat("echec");
    }
    setTimeout(() => setEtat("repos"), 2500);
  }

  const texte = etat === "copie" ? "Copié !" : etat === "echec" ? "Copie impossible, sélectionne le texte" : label;
  return (
    <button
      type="button"
      onClick={copier}
      aria-label={etat === "repos" ? ariaLabel : undefined}
      className={`${base} ${className}`}
    >
      {texte}
    </button>
  );
}

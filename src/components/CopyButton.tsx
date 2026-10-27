"use client";

import { useState } from "react";

type Etat = "repos" | "copie" | "echec";

export function CopyButton({ text, label, className = "" }: { text: string; label: string; className?: string }) {
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
      className={`btn btn-primary ${className}`}
    >
      {texte}
    </button>
  );
}

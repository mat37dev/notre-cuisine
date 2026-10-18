"use client";

import { useEffect, useState } from "react";

/** Petite notification affichée après une invitation acceptée : l'appareil est reconnu, le compte est actif. */
export function BandeauBienvenue({ nom }: { nom: string }) {
  const [ouvert, setOuvert] = useState(true);

  useEffect(() => {
    // « ?bienvenue=1 » ne sert qu'une fois : un rechargement ne doit pas réafficher le message
    const adresse = new URL(window.location.href);
    adresse.searchParams.delete("bienvenue");
    window.history.replaceState(null, "", adresse.pathname + adresse.search + adresse.hash);
    const minuteur = setTimeout(() => setOuvert(false), 8000);
    return () => clearTimeout(minuteur);
  }, []);

  if (!ouvert) return null;
  return (
    <div
      role="status"
      className="succes carte-liste mx-auto flex max-w-xl items-start justify-between gap-3 rounded-2xl px-4 py-3 shadow-lg"
    >
      <p>
        <strong>C’est bon, {nom} !</strong> Cet appareil est reconnu : tes recettes seront publiées tout de suite.
      </p>
      <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer" className="text-xl leading-none">
        ×
      </button>
    </div>
  );
}

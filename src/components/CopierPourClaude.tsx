"use client";

import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";

type Etat = "ferme" | "copie" | "echec";

/** Prévient les autres encadrés de la page qu'un encadré s'ouvre : un seul reste ouvert à la fois. */
const EVENEMENT = "nc-aide-claude";

/**
 * Bouton qui copie un message à coller dans Claude, puis ouvre juste en dessous un encadré qui dit quoi en faire :
 * les étapes, un lien pour ouvrir Claude et un pour coller sa réponse sur la page « Ajouter ».
 * Si la copie échoue, l'encadré montre le message pour qu'on le copie à la main.
 */
export function CopierPourClaude({
  text,
  label,
  etapes,
  base = "btn btn-primary",
}: {
  text: string;
  label: string;
  /** Ce qu'il faut faire du message, dans l'ordre. */
  etapes: ReactNode[];
  /** Classes du bouton (ex. "btn btn-variante"). */
  base?: string;
}) {
  const [etat, setEtat] = useState<Etat>("ferme");
  const id = useId();

  useEffect(() => {
    const autreOuvert = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== id) setEtat("ferme");
    };
    window.addEventListener(EVENEMENT, autreOuvert);
    return () => window.removeEventListener(EVENEMENT, autreOuvert);
  }, [id]);

  async function copier() {
    window.dispatchEvent(new CustomEvent(EVENEMENT, { detail: id }));
    try {
      await navigator.clipboard.writeText(text);
      setEtat("copie");
    } catch {
      setEtat("echec");
    }
  }

  const ouvert = etat !== "ferme";
  return (
    // « contents » : le bouton reste dans la rangée de boutons, l'encadré passe sous la rangée, sur toute la largeur
    <div className="contents">
      <button type="button" onClick={copier} aria-expanded={ouvert} aria-controls={id} className={base}>
        {label}
      </button>
      {ouvert && (
        <div
          id={id}
          role="status"
          className="deroule order-last w-full space-y-3 rounded-2xl border-2 border-herbe bg-[color-mix(in_srgb,var(--herbe)_8%,var(--papier))] p-4"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-extrabold text-herbe">
              {etat === "copie" ? "✓ Message copié" : "La copie n’a pas marché : copie le message à la main"}
            </p>
            <button
              type="button"
              onClick={() => setEtat("ferme")}
              aria-label="Fermer"
              className="-mt-1 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-full text-xl text-muted hover:bg-papier"
            >
              ×
            </button>
          </div>
          {etat === "echec" && (
            <textarea
              readOnly
              value={text}
              rows={4}
              aria-label="Message à copier"
              onFocus={(e) => e.currentTarget.select()}
              className="champ font-mono text-xs"
            />
          )}
          <ol className="space-y-2">
            {etapes.map((etape, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full bg-herbe text-xs font-extrabold text-white"
                >
                  {i + 1}
                </span>
                <span className="pt-0.5">{etape}</span>
              </li>
            ))}
          </ol>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <a href="https://claude.ai/new" target="_blank" rel="noopener noreferrer" className="btn btn-secondary px-3 whitespace-nowrap">
              Ouvrir Claude ↗
            </a>
            <Link href="/ajouter" className="btn btn-primary px-3 whitespace-nowrap">
              Ajouter →
            </Link>
          </div>
          {etat === "copie" && (
            <button type="button" onClick={copier} className="text-sm text-muted underline">
              Copier à nouveau le message
            </button>
          )}
        </div>
      )}
    </div>
  );
}

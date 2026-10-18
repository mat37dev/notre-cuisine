"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

/**
 * Flèche de retour. Si on arrive d'une autre page du site, elle revient en arrière : la liste retrouve ses filtres
 * et sa place. Sinon (lien reçu, onglet ouvert directement), c'est un simple lien vers `repli`.
 */
export function BackLink({ repli = "/", libelle = "Retour" }: { repli?: string; libelle?: string }) {
  const router = useRouter();

  function clic(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return; // nouvel onglet : on laisse faire
    let memeSite = false;
    try {
      memeSite = new URL(document.referrer).origin === window.location.origin;
    } catch {
      // pas de page précédente connue
    }
    if (memeSite && window.history.length > 1) {
      e.preventDefault();
      router.back();
    }
  }

  return (
    <a
      href={repli}
      onClick={clic}
      className="group inline-flex min-h-10 items-center gap-2 rounded-full border border-ligne bg-papier px-4 text-sm font-bold hover:border-brand"
    >
      <span aria-hidden className="transition-transform group-hover:-translate-x-0.5">
        ←
      </span>
      {libelle}
    </a>
  );
}

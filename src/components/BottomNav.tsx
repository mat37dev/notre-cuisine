"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Entree = { href: string; libelle: string; icone: ReactNode; actif: (chemin: string) => boolean };

const trait = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const svg = (enfants: ReactNode) => (
  <svg aria-hidden viewBox="0 0 24 24" width="24" height="24" {...trait}>
    {enfants}
  </svg>
);

const ENTREES: Entree[] = [
  {
    href: "/",
    libelle: "Recettes",
    icone: svg(<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />),
    actif: (c) => c === "/" || c.startsWith("/recettes"),
  },
  {
    href: "/ajouter",
    libelle: "Ajouter",
    icone: svg(
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" />
      </>,
    ),
    actif: (c) => c.startsWith("/ajouter"),
  },
  {
    href: "/compte",
    libelle: "Compte",
    icone: svg(
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
      </>,
    ),
    actif: (c) => c.startsWith("/compte"),
  },
];

const ADMIN: Entree = {
  href: "/admin",
  libelle: "Admin",
  icone: svg(
    <>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>,
  ),
  actif: (c) => c.startsWith("/admin"),
};

/** Barre de navigation fixée en bas de l'écran du téléphone : à portée de pouce, remplace les liens de l'en-tête. */
export function BottomNav({ admin }: { admin: boolean }) {
  const chemin = usePathname() ?? "/";
  const entrees = admin ? [...ENTREES, ADMIN] : ENTREES;
  return (
    <nav
      aria-label="Menu principal"
      className="barre-basse fixed inset-x-0 bottom-0 z-30 border-t border-ligne bg-papier/95 backdrop-blur sm:hidden"
    >
      <ul className="mx-auto flex max-w-md">
        {entrees.map((e) => {
          const actif = e.actif(chemin);
          return (
            <li key={e.href} className="flex-1">
              <Link
                href={e.href}
                aria-current={actif ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-bold ${
                  actif ? "text-brand" : "text-muted"
                }`}
              >
                {e.icone}
                {e.libelle}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

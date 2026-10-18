"use client";

import { useSyncExternalStore } from "react";
import { boutiqueInstallation, ETAT_INSTALLATION_VIDE } from "@/lib/install-prompt";

const AFFICHAGE_INSTALLE = "(display-mode: standalone)";

function abonnerAffichage(rappel: () => void) {
  const mq = window.matchMedia?.(AFFICHAGE_INSTALLE);
  mq?.addEventListener?.("change", rappel);
  return () => mq?.removeEventListener?.("change", rappel);
}
const affichageInstalle = () => Boolean(window.matchMedia?.(AFFICHAGE_INSTALLE)?.matches);

/**
 * Installer le site comme une appli. `carte` (Mon compte, Admin) explique aussi comment faire à la main ;
 * `entete` n'apparaît que lorsque le navigateur propose l'installation.
 */
export function InstallButton({
  variante = "carte",
  boutique = boutiqueInstallation,
}: {
  variante?: "carte" | "entete";
  boutique?: typeof boutiqueInstallation;
}) {
  const etat = useSyncExternalStore(boutique.abonner, boutique.lire, () => ETAT_INSTALLATION_VIDE);
  const ouverteEnAppli = useSyncExternalStore(abonnerAffichage, affichageInstalle, () => false);
  const installee = etat.installee || ouverteEnAppli;

  if (installee) {
    return variante === "entete" ? null : (
      <p role="status" className="succes">
        ✅ L&apos;appli est installée sur cet appareil.
      </p>
    );
  }

  if (etat.evenement) {
    return (
      <button
        type="button"
        onClick={() => void boutique.installer()}
        className={variante === "entete" ? "btn btn-secondary !min-h-10 !px-3 whitespace-nowrap text-sm" : "btn btn-primary"}
      >
        <span aria-hidden>⬇</span> Installer l&apos;appli
      </button>
    );
  }

  if (variante === "entete") return null;
  return (
    <p className="text-sm text-muted">
      Ton navigateur ne propose pas encore l&apos;installation. Sur Chrome (Android ou ordinateur), ouvre le menu ⋮
      puis « Installer l&apos;application ». Sur iPhone, touche Partager puis « Sur l&apos;écran d&apos;accueil ».
    </p>
  );
}

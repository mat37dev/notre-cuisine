export type EvenementInstallation = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export type EtatInstallation = { evenement: EvenementInstallation | null; installee: boolean };

export const ETAT_INSTALLATION_VIDE: EtatInstallation = { evenement: null, installee: false };

/**
 * Garde l'invitation à installer l'appli que le navigateur ne donne qu'une fois (`beforeinstallprompt`),
 * pour que n'importe quel bouton du site, monté avant ou après, puisse la déclencher.
 */
export function creerBoutiqueInstallation() {
  let etat = ETAT_INSTALLATION_VIDE;
  const abonnes = new Set<() => void>();
  let ecoute = false;

  const changer = (suite: Partial<EtatInstallation>) => {
    etat = { ...etat, ...suite };
    abonnes.forEach((f) => f());
  };

  function ecouter() {
    if (ecoute || typeof window === "undefined") return;
    ecoute = true;
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault(); // pas de bannière automatique : on propose notre propre bouton
      changer({ evenement: e as EvenementInstallation });
    });
    window.addEventListener("appinstalled", () => changer({ evenement: null, installee: true }));
  }

  return {
    abonner(rappel: () => void) {
      ecouter();
      abonnes.add(rappel);
      return () => void abonnes.delete(rappel);
    },
    lire: (): EtatInstallation => etat,
    /** Ouvre la fenêtre d'installation du navigateur. L'invitation ne sert qu'une fois, accepter ou refuser. */
    async installer() {
      const evenement = etat.evenement;
      if (!evenement) return;
      await evenement.prompt();
      const choix = await evenement.userChoice;
      changer({ evenement: null, installee: etat.installee || choix.outcome === "accepted" });
    },
  };
}

export const boutiqueInstallation = creerBoutiqueInstallation();

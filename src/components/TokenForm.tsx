"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CopyButton } from "./CopyButton";

function consignes(origine: string, jeton: string): string {
  return [
    `Mon site de recettes est ${origine}. Lis d'abord ${origine}/docs : tout y est expliqué.`,
    `Pour envoyer une recette, fais un POST sur ${origine}/api/recettes avec cet en-tête :`,
    `Authorization: Bearer ${jeton}`,
    `Ce jeton est secret : ne l'affiche à personne et ne l'écris dans aucune recette.`,
  ].join("\n");
}

/** Crée un jeton d'accès à donner à Claude. Il n'est affiché qu'une fois, juste après sa création. */
export function TokenForm() {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [jeton, setJeton] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function creer() {
    setOccupe(true);
    setErreur(null);
    setJeton(null);
    try {
      const res = await fetch("/api/compte/jeton", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label: nom.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { jeton?: string; erreur?: string };
      if (res.ok && data.jeton) {
        setJeton(data.jeton);
        setNom("");
        router.refresh();
      } else {
        setErreur(data.erreur ?? "Une erreur est survenue.");
      }
    } catch {
      setErreur("Impossible de joindre le site.");
    } finally {
      setOccupe(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-sm">
          Nom du jeton
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Claude, Claude Code…"
            className="champ"
          />
        </label>
        <button type="button" onClick={creer} disabled={occupe} className="btn btn-secondary">
          Créer un jeton pour Claude
        </button>
      </div>
      {erreur && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {erreur}
        </p>
      )}
      {jeton && (
        <div className="info space-y-3">
          <p className="text-sm font-semibold">
            Copie-le maintenant : ce jeton ne sera plus affiché. Si tu le perds, retire-le et crées-en un autre.
          </p>
          <code className="block break-all text-sm">{jeton}</code>
          <CopyButton text={jeton} label="Copier le jeton" />
          <label className="block text-sm">
            Consignes à coller à Claude
            <textarea
              readOnly
              rows={5}
              value={consignes(window.location.origin, jeton)}
              className="champ mt-1 font-mono text-xs"
            />
          </label>
          <CopyButton text={consignes(window.location.origin, jeton)} label="Copier les consignes" />
        </div>
      )}
    </div>
  );
}

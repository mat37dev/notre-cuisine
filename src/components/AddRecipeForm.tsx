"use client";

import { useEffect, useMemo, useState } from "react";
import { parseRecipeBlock } from "@/lib/recipe/parse";
import { SHARE_STORAGE_KEY } from "@/lib/share-bridge";
import { CopyButton } from "./CopyButton";
import { RecipeView } from "./RecipeView";

type Resultat =
  | { type: "ok"; message: string; lien: string | null }
  | { type: "erreurs"; erreurs: string[] };

function lirePartage(): string | null {
  try {
    const t = sessionStorage.getItem(SHARE_STORAGE_KEY);
    if (t !== null) sessionStorage.removeItem(SHARE_STORAGE_KEY);
    return t;
  } catch {
    return null;
  }
}

export function AddRecipeForm({ initialText = "" }: { initialText?: string }) {
  const [texte, setTexte] = useState(initialText);
  const [envoi, setEnvoi] = useState(false);
  const [resultat, setResultat] = useState<Resultat | null>(null);

  useEffect(() => {
    const partage = lirePartage();
    if (partage) queueMicrotask(() => setTexte(partage));
  }, []);

  const lecture = useMemo(() => (texte.trim() ? parseRecipeBlock(texte) : null), [texte]);
  const miseAJour = lecture?.ok === true && Boolean(lecture.recipe.id);

  async function coller() {
    try {
      setTexte(await navigator.clipboard.readText());
      setResultat(null);
    } catch {
      setResultat({ type: "erreurs", erreurs: ["Je n'ai pas pu lire le presse-papiers : colle le texte dans la zone."] });
    }
  }

  async function envoyer() {
    setEnvoi(true);
    try {
      const res = await fetch("/api/recettes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ texte }),
      });
      const data = (await res.json().catch(() => ({}))) as { status?: string; lien?: string; errors?: string[] };
      if (res.ok) {
        const publiee = data.status === "published";
        setResultat({
          type: "ok",
          message: publiee
            ? res.status === 200
              ? "Recette mise à jour !"
              : "Recette publiée !"
            : "Recette envoyée : elle est en attente de validation.",
          lien: publiee && data.lien ? data.lien : null,
        });
      } else {
        setResultat({ type: "erreurs", erreurs: data.errors ?? ["Une erreur est survenue, réessaie."] });
      }
    } catch {
      setResultat({ type: "erreurs", erreurs: ["Impossible de joindre le site. Vérifie ta connexion et réessaie."] });
    } finally {
      setEnvoi(false);
    }
  }

  function recommencer() {
    setTexte("");
    setResultat(null);
  }

  const bouton = "min-h-11 rounded-lg px-4 py-2 font-medium";

  if (resultat?.type === "ok") {
    return (
      <div className="space-y-4">
        <p role="status" className="rounded-lg bg-green-100 p-3 text-green-950 dark:bg-green-950 dark:text-green-100">
          {resultat.message}
        </p>
        <div className="flex flex-wrap gap-2">
          {resultat.lien && (
            <a href={resultat.lien} className={`${bouton} bg-orange-600 text-white`}>
              Voir la recette
            </a>
          )}
          <button type="button" onClick={recommencer} className={`${bouton} border border-neutral-400`}>
            Ajouter une autre recette
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <textarea
        aria-label="Recette à envoyer"
        value={texte}
        onChange={(e) => {
          setTexte(e.target.value);
          setResultat(null);
        }}
        rows={8}
        placeholder="Colle ici la réponse de Claude avec la recette."
        className="w-full rounded-lg border border-neutral-300 bg-transparent p-3 font-mono text-sm dark:border-neutral-700"
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={coller} className={`${bouton} border border-neutral-400`}>
          Coller depuis le presse-papiers
        </button>
        <button
          type="button"
          onClick={envoyer}
          disabled={!lecture?.ok || envoi}
          className={`${bouton} bg-orange-600 text-white disabled:opacity-40`}
        >
          {miseAJour ? "Mettre à jour" : "Envoyer"}
        </button>
      </div>

      {lecture && !lecture.ok && (
        <div role="alert" className="space-y-3 rounded-lg bg-red-100 p-3 text-red-950 dark:bg-red-950 dark:text-red-100">
          <ul className="list-disc pl-5">
            {lecture.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
          <CopyButton
            label="Copier un message pour Claude"
            text={`Le site n'a pas réussi à lire ta dernière recette : ${lecture.errors.join(" ")} Renvoie la recette complète dans un seul bloc \`\`\`json, en respectant le format des instructions.`}
          />
        </div>
      )}

      {resultat?.type === "erreurs" && (
        <div role="alert" className="rounded-lg bg-red-100 p-3 text-red-950 dark:bg-red-950 dark:text-red-100">
          <ul className="list-disc pl-5">
            {resultat.erreurs.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {lecture?.ok && (
        <>
          {lecture.warnings.length > 0 && (
            <ul className="list-disc rounded-lg bg-amber-100 p-3 pl-8 text-amber-950 dark:bg-amber-950 dark:text-amber-100">
              {lecture.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <section aria-label="Aperçu" className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <RecipeView recipe={lecture.recipe} />
          </section>
        </>
      )}
    </div>
  );
}

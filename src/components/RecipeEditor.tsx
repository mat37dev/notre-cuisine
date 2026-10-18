"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LIBELLES_CATEGORIES } from "@/lib/recipe/labels";
import { ImageField } from "./ImageField";
import { CATEGORIES, type Categorie, type Recipe, type Unite } from "@/lib/recipe/types";

const LIBELLES_UNITES: Array<[Unite, string]> = [
  ["", "(aucune)"],
  ["g", "g"],
  ["kg", "kg"],
  ["ml", "ml"],
  ["l", "l"],
  ["cas", "c. à soupe"],
  ["cac", "c. à café"],
  ["pincee", "pincée"],
  ["piece", "pièce"],
];

type LigneIngredient = { cle: number; id: string; nom: string; quantite: string; unite: Unite };
type LigneEtape = { cle: number; titre: string; texte: string; chrono: string };

const champ = "champ";

export function RecipeEditor({ recipe, slug }: { recipe: Recipe; slug: string }) {
  const router = useRouter();
  const [titre, setTitre] = useState(recipe.titre);
  const [description, setDescription] = useState(recipe.description ?? "");
  const [portions, setPortions] = useState(String(recipe.portions));
  const [categorie, setCategorie] = useState<Categorie>(recipe.categorie);
  const [tags, setTags] = useState(recipe.tags.join(", "));
  const [notes, setNotes] = useState(recipe.notes ?? "");
  const [ingredients, setIngredients] = useState<LigneIngredient[]>(
    recipe.ingredients.map((i, n) => ({
      cle: n,
      id: i.id,
      nom: i.nom,
      quantite: i.quantite === null ? "" : String(i.quantite).replace(".", ","),
      unite: i.unite,
    })),
  );
  const [etapes, setEtapes] = useState<LigneEtape[]>(
    recipe.etapes.map((e, n) => ({
      cle: n,
      titre: e.titre ?? "",
      texte: e.texte,
      chrono: e.chrono_secondes ? String(e.chrono_secondes) : "",
    })),
  );
  const [prochaineCle, setProchaineCle] = useState(1000);
  const [envoi, setEnvoi] = useState(false);
  const [erreurs, setErreurs] = useState<string[]>([]);

  const majIngredient = (cle: number, p: Partial<LigneIngredient>) =>
    setIngredients((l) => l.map((x) => (x.cle === cle ? { ...x, ...p } : x)));
  const majEtape = (cle: number, p: Partial<LigneEtape>) =>
    setEtapes((l) => l.map((x) => (x.cle === cle ? { ...x, ...p } : x)));

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    const nombre = (s: string): number | string | null => {
      const t = s.trim().replace(",", ".");
      if (t === "") return null;
      return Number.isFinite(Number(t)) ? Number(t) : t;
    };
    const charge = {
      id: recipe.id,
      titre,
      description,
      portions: Number(portions),
      categorie,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      ingredients: ingredients
        .filter((i) => i.nom.trim())
        .map((i) => ({ id: i.id || undefined, nom: i.nom, quantite: nombre(i.quantite), unite: i.unite })),
      etapes: etapes
        .filter((s) => s.texte.trim())
        .map((s) => ({
          titre: s.titre || undefined,
          texte: s.texte,
          chrono_secondes: s.chrono ? Number(s.chrono) : undefined,
        })),
      notes,
    };
    setEnvoi(true);
    setErreurs([]);
    try {
      const res = await fetch("/api/recettes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ texte: "```json\n" + JSON.stringify(charge, null, 2) + "\n```" }),
      });
      const data = (await res.json().catch(() => ({}))) as { slug?: string; errors?: string[] };
      if (res.ok) router.push(`/recettes/${data.slug ?? slug}`);
      else setErreurs(data.errors ?? ["Une erreur est survenue, réessaie."]);
    } catch {
      setErreurs(["Impossible de joindre le site. Vérifie ta connexion et réessaie."]);
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <form onSubmit={enregistrer} className="space-y-6">
      {recipe.id && <ImageField recipeId={recipe.id} titre={recipe.titre} image={recipe.image} />}
      <div className="space-y-3">
        <label className="block">
          Titre
          <input className={champ} value={titre} onChange={(e) => setTitre(e.target.value)} />
        </label>
        <label className="block">
          Description
          <input className={champ} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            Portions
            <input
              className={champ}
              type="number"
              min={1}
              value={portions === "" ? "" : Number(portions)}
              onChange={(e) => setPortions(e.target.value)}
            />
          </label>
          <label className="block">
            Catégorie
            <select className={champ} value={categorie} onChange={(e) => setCategorie(e.target.value as Categorie)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {LIBELLES_CATEGORIES[c]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          Mots-clés (séparés par des virgules)
          <input className={champ} value={tags} onChange={(e) => setTags(e.target.value)} />
        </label>
      </div>

      <fieldset className="space-y-3">
        <legend className="titre text-2xl">Ingrédients</legend>
        {ingredients.map((ing) => (
          <div key={ing.cle} className="grid grid-cols-[1fr_5rem_6.5rem_auto] items-end gap-2">
            <input
              aria-label="Ingrédient"
              placeholder="Ingrédient"
              className={champ}
              value={ing.nom}
              onChange={(e) => majIngredient(ing.cle, { nom: e.target.value })}
            />
            <input
              aria-label="Quantité"
              placeholder="Qté"
              inputMode="decimal"
              className={champ}
              value={ing.quantite}
              onChange={(e) => majIngredient(ing.cle, { quantite: e.target.value })}
            />
            <select
              aria-label="Unité"
              className={champ}
              value={ing.unite}
              onChange={(e) => majIngredient(ing.cle, { unite: e.target.value as Unite })}
            >
              {LIBELLES_UNITES.map(([valeur, texte]) => (
                <option key={valeur} value={valeur}>
                  {texte}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label="Supprimer l'ingrédient"
              className="btn btn-secondary !px-0 size-11"
              onClick={() => setIngredients((l) => l.filter((x) => x.cle !== ing.cle))}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setIngredients((l) => [...l, { cle: prochaineCle, id: "", nom: "", quantite: "", unite: "" }]);
            setProchaineCle((n) => n + 1);
          }}
        >
          Ajouter un ingrédient
        </button>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="titre text-2xl">Étapes</legend>
        <p className="text-sm text-muted">
          Écris {"{{id}}"} dans une étape pour y afficher la quantité d’un ingrédient (par exemple {"{{pignons}}"}).
        </p>
        {etapes.map((etape, n) => (
          <div key={etape.cle} className="carte space-y-2 p-3">
            <p className="font-bold">Étape {n + 1}</p>
            <input
              aria-label="Titre de l'étape"
              placeholder="Titre (facultatif)"
              className={champ}
              value={etape.titre}
              onChange={(e) => majEtape(etape.cle, { titre: e.target.value })}
            />
            <textarea
              aria-label="Texte de l'étape"
              rows={3}
              className={champ}
              value={etape.texte}
              onChange={(e) => majEtape(etape.cle, { texte: e.target.value })}
            />
            <div className="flex items-end gap-2">
              <input
                aria-label="Chrono en secondes"
                placeholder="Chrono (secondes)"
                inputMode="numeric"
                className={champ}
                value={etape.chrono}
                onChange={(e) => majEtape(etape.cle, { chrono: e.target.value.replace(/\D/g, "") })}
              />
              <button
                type="button"
                aria-label="Supprimer l'étape"
                className="btn btn-secondary shrink-0 !px-3"
                onClick={() => setEtapes((l) => l.filter((x) => x.cle !== etape.cle))}
              >
                Supprimer l’étape
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setEtapes((l) => [...l, { cle: prochaineCle, titre: "", texte: "", chrono: "" }]);
            setProchaineCle((n) => n + 1);
          }}
        >
          Ajouter une étape
        </button>
      </fieldset>

      <label className="block">
        Notes
        <textarea className={champ} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      {erreurs.length > 0 && (
        <div role="alert" className="alerte">
          <ul className="list-disc pl-5">
            {erreurs.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="submit"
        disabled={envoi}
        className="btn btn-primary !px-6"
      >
        Enregistrer
      </button>
    </form>
  );
}

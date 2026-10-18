"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { redimensionner } from "@/lib/image-client";

/** Photo d'une recette : choisir, remplacer ou retirer. L'image est réduite avant l'envoi. */
export function ImageField({
  recipeId,
  titre,
  image: imageInitiale,
  resize = redimensionner,
}: {
  recipeId: string;
  titre: string;
  image?: string;
  resize?: (fichier: File) => Promise<Blob>;
}) {
  const router = useRouter();
  const [image, setImage] = useState(imageInitiale);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const adresse = `/api/recettes/${recipeId}/image`;

  async function choisir(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = ""; // permet de rechoisir le même fichier
    if (!fichier) return;
    setErreur(null);
    setOccupe(true);
    try {
      let reduite: Blob;
      try {
        reduite = await resize(fichier);
      } catch {
        setErreur("Impossible de lire cette image. Essaie un fichier JPEG, PNG ou WebP.");
        return;
      }
      const corps = new FormData();
      corps.set("image", reduite, "photo.jpg");
      const res = await fetch(adresse, { method: "POST", body: corps });
      const data = (await res.json().catch(() => ({}))) as { image?: string; erreur?: string };
      if (res.ok && data.image) {
        setImage(data.image);
        router.refresh();
      } else {
        setErreur(data.erreur ?? "L'envoi de la photo a échoué.");
      }
    } catch {
      setErreur("Impossible de joindre le site. Vérifie ta connexion et réessaie.");
    } finally {
      setOccupe(false);
    }
  }

  async function retirer() {
    setErreur(null);
    setOccupe(true);
    try {
      const res = await fetch(adresse, { method: "DELETE" });
      if (res.ok) {
        setImage(undefined);
        router.refresh();
      } else {
        const data = (await res.json().catch(() => ({}))) as { erreur?: string };
        setErreur(data.erreur ?? "Impossible de retirer la photo.");
      }
    } catch {
      setErreur("Impossible de joindre le site. Vérifie ta connexion et réessaie.");
    } finally {
      setOccupe(false);
    }
  }

  return (
    <div className="space-y-3">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={`Photo de ${titre}`} className="aspect-[16/10] w-full rounded-2xl object-cover" />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <label className="btn btn-secondary cursor-pointer">
          <span>Choisir une photo</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={choisir}
            disabled={occupe}
          />
        </label>
        {image && (
          <button type="button" className="btn btn-danger" onClick={retirer} disabled={occupe}>
            Retirer la photo
          </button>
        )}
        {occupe && <span className="text-sm text-muted">Envoi en cours…</span>}
      </div>
      {erreur && (
        <p role="alert" className="text-sm text-danger">
          {erreur}
        </p>
      )}
    </div>
  );
}

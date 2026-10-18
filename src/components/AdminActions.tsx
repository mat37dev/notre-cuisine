"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CopyButton } from "./CopyButton";

const STYLES = {
  primaire: "btn-primary",
  danger: "btn-danger",
  neutre: "btn-secondary",
};

/** Bouton qui appelle une adresse du site puis rafraîchit la page (ou va ailleurs). */
export function ActionButton({
  url,
  label,
  method = "POST",
  confirm,
  then,
  style = "neutre",
}: {
  url: string;
  label: string;
  method?: "POST" | "DELETE";
  confirm?: string;
  then?: string;
  style?: keyof typeof STYLES;
}) {
  const router = useRouter();
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function clic() {
    if (confirm && !window.confirm(confirm)) return;
    setOccupe(true);
    setErreur(null);
    try {
      const res = await fetch(url, { method });
      if (res.ok) {
        if (then) router.push(then);
        else router.refresh();
      } else {
        const data = (await res.json().catch(() => ({}))) as { erreur?: string };
        setErreur(data.erreur ?? "Une erreur est survenue.");
      }
    } catch {
      setErreur("Impossible de joindre le site.");
    } finally {
      setOccupe(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={clic}
        disabled={occupe}
        className={`btn ${STYLES[style]}`}
      >
        {label}
      </button>
      {erreur && (
        <span role="alert" className="text-sm font-semibold text-danger">
          {erreur}
        </span>
      )}
    </span>
  );
}

/** Crée un lien d'invitation : pour une nouvelle personne, ou pour un autre appareil d'une personne existante. */
export function InviteForm({
  profilId,
  profilNom,
  endpoint = "/api/admin/inviter",
  avecNomAppareil = false,
}: {
  profilId?: string;
  profilNom?: string;
  /** Adresse appelée ; `/api/compte/inviter` pour un appareil de plus sur son propre compte. */
  endpoint?: string;
  avecNomAppareil?: boolean;
}) {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [nomAppareil, setNomAppareil] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [lien, setLien] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!lien) return;
    let annule = false;
    import("qrcode")
      .then((m) => m.toDataURL(lien, { margin: 1, width: 220 }))
      .then((url) => {
        if (!annule) setQr(url);
      })
      .catch(() => {});
    return () => {
      annule = true;
    };
  }, [lien]);

  async function creer() {
    setOccupe(true);
    setErreur(null);
    setQr(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(avecNomAppareil ? { label: nomAppareil.trim() } : profilId ? { profilId } : { nom }),
      });
      const data = (await res.json().catch(() => ({}))) as { lien?: string; erreur?: string };
      if (res.ok && data.lien) {
        setLien(data.lien);
        setNom("");
        setNomAppareil("");
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
        {avecNomAppareil && (
          <label className="flex flex-col text-sm">
            Nom de l&apos;appareil
            <input
              value={nomAppareil}
              onChange={(e) => setNomAppareil(e.target.value)}
              placeholder="Mon PC, ma tablette…"
              className="champ"
            />
          </label>
        )}
        {!profilId && !avecNomAppareil && (
          <label className="flex flex-col text-sm">
            Prénom
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="champ"
            />
          </label>
        )}
        <button
          type="button"
          onClick={creer}
          disabled={occupe || (!profilId && !avecNomAppareil && !nom.trim())}
          className="btn btn-secondary"
        >
          {avecNomAppareil ? "Ajouter un appareil" : profilId ? `Inviter un autre appareil pour ${profilNom}` : "Créer le lien d'invitation"}
        </button>
      </div>
      {erreur && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {erreur}
        </p>
      )}
      {lien && (
        <div className="info space-y-2">
          <p className="text-sm">
            Valable 7 jours, une seule utilisation. À ouvrir sur l’appareil à reconnaître :
          </p>
          <code className="block break-all text-sm">{lien}</code>
          <CopyButton text={lien} label="Copier le lien" />
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR code de l'invitation" width={220} height={220} className="rounded bg-white" />
          )}
        </div>
      )}
    </div>
  );
}

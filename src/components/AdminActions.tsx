"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CopyButton } from "./CopyButton";

const STYLES = {
  primaire: "bg-orange-600 text-white",
  danger: "border border-red-600 text-red-700 dark:text-red-400",
  neutre: "border border-neutral-400",
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
        className={`min-h-11 rounded-lg px-4 py-2 font-medium disabled:opacity-40 ${STYLES[style]}`}
      >
        {label}
      </button>
      {erreur && (
        <span role="alert" className="text-sm text-red-700 dark:text-red-400">
          {erreur}
        </span>
      )}
    </span>
  );
}

/** Crée un lien d'invitation : pour une nouvelle personne, ou pour un autre appareil d'une personne existante. */
export function InviteForm({ profilId, profilNom }: { profilId?: string; profilNom?: string }) {
  const router = useRouter();
  const [nom, setNom] = useState("");
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
      const res = await fetch("/api/admin/inviter", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profilId ? { profilId } : { nom }),
      });
      const data = (await res.json().catch(() => ({}))) as { lien?: string; erreur?: string };
      if (res.ok && data.lien) {
        setLien(data.lien);
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
        {!profilId && (
          <label className="flex flex-col text-sm">
            Prénom
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="min-h-11 rounded-lg border border-neutral-300 bg-transparent px-3 dark:border-neutral-700"
            />
          </label>
        )}
        <button
          type="button"
          onClick={creer}
          disabled={occupe || (!profilId && !nom.trim())}
          className="min-h-11 rounded-lg border border-neutral-400 px-4 py-2 font-medium disabled:opacity-40"
        >
          {profilId ? `Inviter un autre appareil pour ${profilNom}` : "Créer le lien d'invitation"}
        </button>
      </div>
      {erreur && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {erreur}
        </p>
      )}
      {lien && (
        <div className="space-y-2 rounded-lg bg-neutral-100 p-3 dark:bg-neutral-800">
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

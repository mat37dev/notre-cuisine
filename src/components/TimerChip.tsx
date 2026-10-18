"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { clockIntentUrl, formatClock, remainingMs } from "@/lib/timer";

type Etat =
  | { type: "repos" }
  | { type: "marche"; fin: number }
  | { type: "pause"; restant: number }
  | { type: "fini" };

function bip() {
  try {
    navigator.vibrate?.([300, 150, 300, 150, 600]);
    const Contexte = window.AudioContext;
    if (!Contexte) return;
    const ctx = new Contexte();
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      osc.frequency.value = 880;
      osc.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.5);
      osc.stop(ctx.currentTime + i * 0.5 + 0.3);
    }
  } catch {
    // pas de son possible : l'affichage « Terminé » reste
  }
}

export function TimerChip({ secondes }: { secondes: number }) {
  const [etat, setEtat] = useState<Etat>({ type: "repos" });
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const android = useSyncExternalStore(
    () => () => {},
    () => /Android/i.test(navigator.userAgent),
    () => false,
  );
  const verrou = useRef<{ release: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (etat.type !== "marche") return;
    const id = setInterval(() => {
      const now = Date.now();
      setMaintenant(now);
      if (remainingMs(etat.fin, now) === 0) {
        setEtat({ type: "fini" });
        bip();
      }
    }, 250);
    return () => clearInterval(id);
  }, [etat]);

  // garde l'écran allumé tant que le chrono tourne
  useEffect(() => {
    if (etat.type !== "marche") return;
    let annule = false;
    navigator.wakeLock
      ?.request("screen")
      .then((v) => {
        if (annule) void v.release();
        else verrou.current = v;
      })
      .catch(() => {});
    return () => {
      annule = true;
      void verrou.current?.release().catch(() => {});
      verrou.current = null;
    };
  }, [etat.type]);

  function clic() {
    const now = Date.now();
    if (etat.type === "marche") setEtat({ type: "pause", restant: remainingMs(etat.fin, now) });
    else if (etat.type === "pause") setEtat({ type: "marche", fin: now + etat.restant });
    else {
      setMaintenant(now);
      setEtat({ type: "marche", fin: now + secondes * 1000 });
    }
  }

  const style = "btn btn-secondary !rounded-full font-mono !text-brand";

  if (etat.type === "fini") {
    return (
      <span className="inline-flex items-center gap-2">
        <span role="status" className="succes !rounded-full !px-4 !py-2">
          Terminé !
        </span>
        <button type="button" className={style} onClick={() => setEtat({ type: "repos" })}>
          Relancer
        </button>
      </span>
    );
  }

  const ms =
    etat.type === "marche" ? remainingMs(etat.fin, maintenant) : etat.type === "pause" ? etat.restant : secondes * 1000;
  const icone = etat.type === "marche" ? "⏸" : "▶";
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button type="button" className={style} onClick={clic}>
        <span aria-hidden>{icone}</span> {formatClock(ms)}
      </button>
      {android && etat.type === "repos" && (
        <a className="text-sm font-semibold text-brand underline" href={clockIntentUrl(secondes)}>
          Horloge du téléphone
        </a>
      )}
    </span>
  );
}

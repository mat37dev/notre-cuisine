"use client";

import { useEffect } from "react";

/** Enregistre le service worker (hors ligne). Seulement en production : en développement il gênerait le rechargement. */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}

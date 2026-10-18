/** Temps restant avant `endsAt`, jamais négatif. */
export function remainingMs(endsAt: number, now: number): number {
  return Math.max(0, endsAt - now);
}

/** « 02:30 », ou « 1:05:00 » au-delà d'une heure. Arrondi à la seconde supérieure. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const deux = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${deux(m)}:${deux(s)}` : `${deux(m)}:${deux(s)}`;
}

/** Lien Android qui demande à l'appli Horloge de lancer un minuteur (à vérifier sur le téléphone). */
export function clockIntentUrl(seconds: number): string {
  return `intent:#Intent;action=android.intent.action.SET_TIMER;i.android.intent.extra.alarm.LENGTH=${Math.round(seconds)};B.android.intent.extra.alarm.SKIP_UI=true;end`;
}

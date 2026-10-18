import { json } from "@/lib/http";
import { getStore } from "@/lib/store";

const VARIABLES = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "CRON_SECRET", "IP_HASH_SALT", "SITE_URL"] as const;

/** Raison de la panne, en français, sans jamais recopier le message interne (il pourrait contenir des secrets). */
function expliquer(message: string): string {
  if (/schema cache|does not exist|relation .* does not exist|Could not find the table/i.test(message)) {
    return "tables manquantes : exécute le fichier SQL de supabase/migrations";
  }
  if (/invalid api key|jwt|apikey|unauthorized/i.test(message)) {
    return "clé refusée : vérifie SUPABASE_SERVICE_ROLE_KEY";
  }
  return "la base ne répond pas";
}

/** Contrôle de santé public : quelles variables existent (oui/non, jamais leur valeur) et la base répond-elle ? */
export async function GET() {
  const variables = Object.fromEntries(VARIABLES.map((nom) => [nom, Boolean(process.env[nom])]));
  let base = "ok";
  try {
    await getStore().ping();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    base = /pas configuré/.test(message)
      ? "non configurée : il manque SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY"
      : expliquer(message);
  }
  const ok = base === "ok";
  return json({ ok, base, variables }, ok ? 200 : 503);
}

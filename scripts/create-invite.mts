// Crée une personne et son lien d'invitation : npm run invite -- --role admin --name Mathieu
// Lit SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.production.local (ou dans l'environnement).
// Ce fichier-là n'est JAMAIS lu par « npm run dev » : le site local ne touche donc jamais à la vraie base.
import { createInviteLink } from "../src/lib/auth";
import { parseInviteArgs } from "../src/lib/invite-cli";
import { SupabaseStore } from "../src/lib/store/supabase";

try {
  process.loadEnvFile(".env.production.local");
} catch {
  // pas de fichier : on utilise l'environnement tel quel
}

const args = parseInviteArgs(process.argv.slice(2));
if ("error" in args) {
  console.error(args.error);
  process.exit(1);
}
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SITE_URL } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Il manque SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY (voir .env.example).");
  process.exit(1);
}

const store = new SupabaseStore(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const profil = await store.createProfile(args.name, args.role);
const lien = await createInviteLink(store, profil.id, args.label, SITE_URL || "http://localhost:3000");
console.log(`\nLien d'invitation pour ${args.name} (valable 7 jours, une seule utilisation) :\n${lien}\n`);

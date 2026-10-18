import { SupabaseStore } from "./supabase";
import type { Store } from "./types";

let remplacement: Store | null = null;
let defaut: Store | null = null;

/** Le stockage de l'application (Supabase), ou celui injecté par les tests. */
export function getStore(): Store {
  if (remplacement) return remplacement;
  if (!defaut) {
    const url = process.env.SUPABASE_URL;
    const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !cle) {
      throw new Error("Supabase n'est pas configuré : il manque SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.");
    }
    defaut = new SupabaseStore(url, cle);
  }
  return defaut;
}

export function setStoreForTests(store: Store | null): void {
  remplacement = store;
}

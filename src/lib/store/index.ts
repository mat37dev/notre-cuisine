import { EXEMPLE_RECETTE } from "../recipe/prompts";
import { MemoryStore } from "./memory";
import { SupabaseStore } from "./supabase";
import type { Store } from "./types";

let remplacement: Store | null = null;
let defaut: Store | null = null;

const globale = globalThis as typeof globalThis & { __ncDevStore?: Store };

/** Développement local sans Supabase : une base en mémoire avec une recette d'exemple. */
function baseDeDeveloppement(): Store {
  if (!globale.__ncDevStore) {
    const store = new MemoryStore();
    void store.insertRecipe({ status: "published", authorId: null, recipe: EXEMPLE_RECETTE });
    globale.__ncDevStore = store;
    console.warn("Supabase n'est pas configuré : base en mémoire (les données disparaissent à l'arrêt).");
  }
  return globale.__ncDevStore;
}

/** Le stockage de l'application (Supabase), ou celui injecté par les tests. */
export function getStore(): Store {
  if (remplacement) return remplacement;
  if (!defaut) {
    const url = process.env.SUPABASE_URL;
    const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !cle) {
      if (process.env.NODE_ENV !== "production") return baseDeDeveloppement();
      throw new Error("Supabase n'est pas configuré : il manque SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.");
    }
    defaut = new SupabaseStore(url, cle);
  }
  return defaut;
}

export function setStoreForTests(store: Store | null): void {
  remplacement = store;
}

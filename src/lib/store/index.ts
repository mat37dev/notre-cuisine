import { hashToken } from "../auth";
import { RECETTES_DEMO } from "../dev-demo";
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
    const brut = new MemoryStore();
    const store: Store = brut;
    const prete = (async () => {
      for (const recipe of [EXEMPLE_RECETTE, ...RECETTES_DEMO]) {
        await store.insertRecipe({ status: "published", authorId: null, recipe });
      }
      // Un administrateur de démonstration : en développement, le cookie `nc_device=dev-admin` le donne.
      const admin = await store.createProfile("Démo", "admin");
      const demain = new Date(Date.now() + 86_400_000).toISOString();
      await store.createInvite(admin.id, "Navigateur de démo", hashToken("dev-invite"), demain);
      await store.claimInvite(hashToken("dev-invite"), hashToken("dev-admin"), new Date().toISOString());
    })();
    // Chaque appel attend la fin de la préparation : la première page ouverte ne voit jamais une base à moitié remplie.
    globale.__ncDevStore = new Proxy(brut, {
      get(cible, nom) {
        const valeur = Reflect.get(cible, nom) as unknown;
        return typeof valeur === "function"
          ? async (...args: unknown[]) => {
              await prete;
              return (valeur as (...a: unknown[]) => unknown).apply(cible, args);
            }
          : valeur;
      },
    });
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

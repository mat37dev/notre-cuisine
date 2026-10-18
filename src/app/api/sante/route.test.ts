// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { setStoreForTests } from "@/lib/store";
import { MemoryStore } from "@/lib/store/memory";
import { dynamic, GET } from "./route";

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://exemple.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "cle-ultra-secrete-123");
  vi.stubEnv("CRON_SECRET", "");
  vi.stubEnv("IP_HASH_SALT", "sel");
  vi.stubEnv("SITE_URL", "");
});
afterEach(() => {
  setStoreForTests(null);
  vi.unstubAllEnvs();
});

const appeler = async () => {
  const res = await GET();
  const texte = await res.text();
  return { status: res.status, json: JSON.parse(texte), texte };
};

function storeQuiEchoue(message: string) {
  const s = new MemoryStore();
  s.ping = async () => {
    throw new Error(message);
  };
  return s;
}

describe("GET /api/sante", () => {
  test("tout va bien : 200, variables présentes, base joignable", async () => {
    setStoreForTests(new MemoryStore());
    const { status, json } = await appeler();
    expect(status).toBe(200);
    expect(json).toEqual({
      ok: true,
      base: "ok",
      adresse: "ok",
      cle: "format inconnu (ni sb_secret_, ni JWT)",
      variables: {
        SUPABASE_URL: true,
        SUPABASE_SERVICE_ROLE_KEY: true,
        CRON_SECRET: false,
        IP_HASH_SALT: true,
        SITE_URL: false,
      },
    });
  });

  test("tables absentes : 503 et un message qui dit quoi faire", async () => {
    setStoreForTests(storeQuiEchoue("Base de données : Could not find the table 'public.profiles' in the schema cache"));
    const { status, json } = await appeler();
    expect(status).toBe(503);
    expect(json.ok).toBe(false);
    expect(json.base).toBe("tables manquantes : exécute le fichier SQL de supabase/migrations");
  });

  test("clé refusée : 503", async () => {
    setStoreForTests(storeQuiEchoue("Base de données : Invalid API key"));
    const { status, json } = await appeler();
    expect(status).toBe(503);
    expect(json.base).toBe("clé refusée : vérifie SUPABASE_SERVICE_ROLE_KEY");
  });

  test("autre erreur : 503 avec un message générique, sans détail interne", async () => {
    setStoreForTests(storeQuiEchoue("connexion refusée vers 10.0.0.12:5432 avec le mot de passe hunter2"));
    const { status, json, texte } = await appeler();
    expect(status).toBe(503);
    expect(json.base).toBe("la base ne répond pas");
    expect(texte).not.toContain("hunter2");
    expect(texte).not.toContain("10.0.0.12");
  });

  test("Supabase pas configuré : 503 et le dit, sans jamais afficher les valeurs des variables", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const { status, json, texte } = await appeler();
    expect(status).toBe(503);
    expect(json.base).toBe("non configurée : il manque SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
    expect(json.variables.SUPABASE_URL).toBe(false);
    expect(texte).not.toContain("exemple.supabase.co");
  });

  test("ne contient jamais la valeur d'une variable", async () => {
    setStoreForTests(new MemoryStore());
    const { texte } = await appeler();
    expect(texte).not.toContain("cle-ultra-secrete-123");
    expect(texte).not.toContain("exemple.supabase.co");
  });
});

describe("calcul à chaque appel", () => {
  test("la route est dynamique : sans cela Next la calcule une fois à la construction et affiche un état périmé", () => {
    expect(dynamic).toBe("force-dynamic");
  });
});

describe("diagnostic de la clé", () => {
  test("clé refusée : dit de quel type est la clé collée, sans la recopier", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_publishable_CorpsDeLaCle42");
    setStoreForTests(storeQuiEchoue("Base de données : Invalid API key"));
    const { json, texte } = await appeler();
    expect(json.base).toBe("clé refusée : vérifie SUPABASE_SERVICE_ROLE_KEY");
    expect(json.cle).toContain("clé publique");
    expect(texte).not.toContain("CorpsDeLaCle42");
  });

  test("adresse avec des guillemets : signalée", async () => {
    vi.stubEnv("SUPABASE_URL", '"https://exemple.supabase.co"');
    setStoreForTests(new MemoryStore());
    expect((await appeler()).json.adresse).toContain("espaces, guillemets");
  });
});

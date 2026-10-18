import { afterEach, describe, expect, test, vi } from "vitest";
import { getStore, setStoreForTests } from "./index";

afterEach(() => {
  vi.unstubAllEnvs();
  setStoreForTests(null);
});

describe("getStore", () => {
  test("en développement sans Supabase : une base en mémoire avec une recette d'exemple", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const rows = await getStore().listRecipes({ status: "published" });
    expect(rows).toHaveLength(1);
    expect(rows[0].recipe.titre).toBe("Salade italienne à la burrata");
  });

  test("en production sans Supabase : erreur claire (pas de base cachée en mémoire)", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(() => getStore()).toThrow("Supabase n'est pas configuré");
  });

  test("le store injecté par les tests a la priorité", async () => {
    const faux = { ping: async () => {} } as never;
    setStoreForTests(faux);
    expect(getStore()).toBe(faux);
  });
});

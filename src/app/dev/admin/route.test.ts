// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";
import { DEVICE_COOKIE } from "@/lib/auth";
import { GET } from "./route";

afterEach(() => vi.unstubAllEnvs());

describe("GET /dev/admin : connexion de démonstration, en développement seulement", () => {
  test("en développement : cookie de l'administrateur de démonstration puis retour à l'accueil", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const res = await GET(new Request("http://localhost:3000/dev/admin"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("http://localhost:3000/");
    expect(res.headers.get("set-cookie")).toContain(`${DEVICE_COOKIE}=dev-admin`);
  });

  test("en production : n'existe pas (404) et ne donne aucun cookie", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await GET(new Request("https://notre-cuisine.example/dev/admin"));
    expect(res.status).toBe(404);
    expect(res.headers.get("set-cookie")).toBeNull();
  });

  test("même si quelqu'un devine l'adresse : le cookie de démonstration ne donne rien en production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const { getStore } = await import("@/lib/store");
    expect(() => getStore()).toThrow("Supabase n'est pas configuré"); // pas de base de démonstration en production
  });
});

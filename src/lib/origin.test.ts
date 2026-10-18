// @vitest-environment node
import { afterEach, describe, expect, test, vi } from "vitest";

let entetes: Record<string, string> = {};
vi.mock("next/headers", () => ({ headers: async () => new Headers(entetes) }));

import { getOrigin } from "./origin";

afterEach(() => {
  vi.unstubAllEnvs();
  entetes = {};
});

describe("getOrigin : adresse affichée dans les pages", () => {
  test("c'est l'adresse où la personne est connectée, même si SITE_URL en indique une autre", async () => {
    vi.stubEnv("SITE_URL", "https://notre-cuisine.vercel.app");
    entetes = { "x-forwarded-host": "cuisine.mathieucrosnier.fr", "x-forwarded-proto": "https" };
    expect(await getOrigin()).toBe("https://cuisine.mathieucrosnier.fr");
  });

  test("sans en-tête de proxy : l'en-tête host, en https (http pour localhost)", async () => {
    entetes = { host: "cuisine.mathieucrosnier.fr" };
    expect(await getOrigin()).toBe("https://cuisine.mathieucrosnier.fr");
    entetes = { host: "localhost:3000" };
    expect(await getOrigin()).toBe("http://localhost:3000");
  });

  test("aucune information sur la requête : SITE_URL sans « / » final", async () => {
    vi.stubEnv("SITE_URL", "https://cuisine.mathieucrosnier.fr/");
    entetes = {};
    expect(await getOrigin()).toBe("https://cuisine.mathieucrosnier.fr");
  });
});

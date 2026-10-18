// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

type Classer = (url: string, method: string, origine: string) => "ignorer" | "statique" | "reseau";

/** Charge public/sw.js dans un faux contexte de service worker et récupère sa fonction de tri. */
function chargerTri(): Classer {
  const code = readFileSync(join(process.cwd(), "public", "sw.js"), "utf8");
  const faux: Record<string, unknown> = { addEventListener: () => {} };
  new Function("self", code)(faux);
  return faux.__ncClasser as Classer;
}

const classer = chargerTri();
const O = "https://cuisine.test";
const tri = (chemin: string, methode = "GET") => classer(O + chemin, methode, O);

describe("service worker : quoi mettre en cache", () => {
  test.each([
    "/admin",
    "/admin/quelque-chose",
    "/invite/abc123",
    "/api/admin/export",
    "/api/cron/keepalive",
    "/ajouter/partage",
  ])("%s n'est jamais mis en cache", (chemin) => {
    expect(tri(chemin)).toBe("ignorer");
  });

  test("seules les requêtes GET du site lui-même sont concernées", () => {
    expect(tri("/api/recettes", "POST")).toBe("ignorer");
    expect(tri("/recettes/salade", "DELETE")).toBe("ignorer");
    expect(classer("https://autre.test/x.js", "GET", O)).toBe("ignorer");
  });

  test("fichiers fixes : cache d'abord", () => {
    expect(tri("/_next/static/chunks/app.js")).toBe("statique");
    expect(tri("/icon-192.png")).toBe("statique");
    expect(tri("/icon-maskable-512.png")).toBe("statique");
  });

  test("pages et liste des recettes : réseau d'abord, cache en secours", () => {
    for (const chemin of ["/", "/recettes/salade-burrata", "/api/recettes", "/api/recettes?q=burrata", "/ajouter", "/claude"]) {
      expect(tri(chemin), chemin).toBe("reseau");
    }
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

type Redirection = {
  source: string;
  has?: Array<{ type: string; value?: string }>;
  destination: string;
  permanent?: boolean;
};
const config = JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8")) as { redirects?: Redirection[] };
const redirection = config.redirects?.[0];

describe("vercel.json : une seule adresse pour le site", () => {
  test("les adresses *.vercel.app renvoient vers cuisine.mathieucrosnier.fr, en gardant le chemin", () => {
    expect(redirection).toBeDefined();
    expect(redirection!.has).toContainEqual({ type: "host", value: String.raw`notre-cuisine.*\.vercel\.app` });
    expect(redirection!.destination).toBe("https://cuisine.mathieucrosnier.fr/$1");
    expect(redirection!.source).toMatch(/^\/\(/); // capture tout le chemin dans $1
  });

  test("la redirection est temporaire (307) : on peut la retirer sans que les navigateurs s'en souviennent", () => {
    expect(redirection!.permanent).toBe(false);
  });

  test("la tâche planifiée (cron) n'est jamais redirigée : la base gratuite doit rester éveillée", () => {
    const motif = new RegExp(`^${redirection!.source}$`);
    expect(motif.test("/api/cron/keepalive")).toBe(false);
    expect(motif.test("/recettes/tarte")).toBe(true);
    expect(motif.test("/invite/abc")).toBe(true);
  });
});

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");
const racine = css.match(/:root\s*{([\s\S]*?)\n}/)?.[1] ?? "";
const couleur = (nom: string): string => {
  const m = racine.match(new RegExp(`--${nom}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`variable --${nom} introuvable dans :root`);
  return m[1];
};

const rvb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
function luminance(hex: string): number {
  const [r, g, b] = rvb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contraste = (a: string, b: string) => {
  const [clair, fonce] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (clair + 0.05) / (fonce + 0.05);
};
function teinte(hex: string): number {
  const [r, g, b] = rvb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

describe("thème : clair, chaud, marron", () => {
  test("un seul thème, pas de mode sombre automatique", () => {
    expect(css).not.toMatch(/prefers-color-scheme:\s*dark/);
    expect(racine).toMatch(/color-scheme:\s*light/);
  });

  test("fond plus foncé et plus chaud que l'ancienne crème (#fbf5ea), cartes plus claires que le fond", () => {
    expect(luminance(couleur("fond"))).toBeLessThan(luminance("#fbf5ea"));
    expect(luminance(couleur("papier"))).toBeGreaterThan(luminance(couleur("fond")));
  });

  test("les couleurs de base restent dans les bruns, jaunes et oranges (teinte entre 15° et 50°)", () => {
    for (const nom of ["fond", "papier", "encre", "muted", "ligne", "brand", "brand-fort", "brand-doux"]) {
      const t = teinte(couleur(nom));
      expect(t, `${nom} (${couleur(nom)})`).toBeGreaterThanOrEqual(15);
      expect(t, `${nom} (${couleur(nom)})`).toBeLessThanOrEqual(50);
    }
  });

  test.each([
    ["encre", "fond", 7],
    ["encre", "papier", 7],
    ["encre", "beurre", 7],
    ["muted", "fond", 4.5],
    ["muted", "papier", 4.5],
    ["sur-brand", "brand", 4.5],
    ["brand", "papier", 4.5],
    ["brand", "fond", 4.5],
    ["brand-fort", "brand-doux", 4.5],
    ["herbe", "papier", 4.5],
    ["danger", "danger-doux", 4.5],
    ["danger", "papier", 4.5],
  ])("%s sur %s : contraste d'au moins %s (lisible)", (texte, fond, minimum) => {
    expect(contraste(couleur(texte), couleur(fond))).toBeGreaterThanOrEqual(minimum);
  });
});

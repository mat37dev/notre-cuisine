import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const css = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");

describe("animations : garde-fous dans la feuille de style", () => {
  test("transition douce entre deux pages (navigation entre documents)", () => {
    expect(css).toMatch(/@view-transition\s*{\s*navigation:\s*auto/);
  });

  test("l'en-tête reste en place pendant les transitions de page", () => {
    expect(css).toMatch(/view-transition-name:\s*entete/);
  });

  test("les animations s'arrêtent pour qui demande « réduire les animations »", () => {
    const bloc = css.match(/@media \(prefers-reduced-motion: reduce\)\s*{[\s\S]*?\n}\n/);
    expect(bloc, "bloc prefers-reduced-motion").not.toBeNull();
    expect(bloc![0]).toMatch(/animation/);
    expect(bloc![0]).toMatch(/transition/);
    expect(bloc![0]).toMatch(/view-transition/);
  });

  test("les cartes apparaissent en fondu, l'une après l'autre", () => {
    expect(css).toMatch(/@keyframes apparition/);
    expect(css).toMatch(/animation-delay:\s*calc\(var\(--i/);
  });
});

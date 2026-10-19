// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, test } from "vitest";

const racine = process.cwd();
const lire = (...chemin: string[]) => readFileSync(join(racine, ...chemin), "utf8");

const COULEURS = ["#a3400e", "#7f330b", "#e0a42a", "#3a2312", "#000000", "#ffffff", "#f8eddb"];
const FICHIERS = [
  "notre-cuisine-symbol-color.svg",
  "notre-cuisine-symbol-small-color.svg",
  "notre-cuisine-horizontal-color.svg",
  "notre-cuisine-stacked-color.svg",
  "notre-cuisine-wordmark-color.svg",
  "notre-cuisine-symbol-black.svg",
  "notre-cuisine-symbol-white.svg",
  "notre-cuisine-horizontal-black.svg",
  "notre-cuisine-horizontal-white.svg",
  "notre-cuisine-stacked-black.svg",
  "notre-cuisine-stacked-white.svg",
];

describe("logo : fichiers du kit (public/logo)", () => {
  test.each(FICHIERS)("%s existe et est un SVG propre : viewBox, titre, pas de texte, pas d'image, pas de filtre", (nom) => {
    const chemin = join("public", "logo", nom);
    expect(existsSync(join(racine, chemin)), chemin).toBe(true);
    const svg = lire(chemin);
    expect(svg).toMatch(/<svg[^>]*viewBox="0 0 \d+ \d+"/);
    expect(svg).toMatch(/<title[^>]*>[^<]+<\/title>/);
    expect(svg).not.toMatch(/<text|<image|<filter|<mask|<clipPath|<style/);
  });

  test.each(FICHIERS)("%s n'utilise que les couleurs de la marque", (nom) => {
    const svg = lire("public", "logo", nom).toLowerCase();
    const utilisees = [...svg.matchAll(/(?:fill|stroke)="(#[0-9a-f]{3,6})"/g)].map((m) => m[1]);
    for (const c of utilisees) expect(COULEURS, `${nom} : ${c}`).toContain(c.length === 4 ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : c);
  });

  test("les logos avec le nom ont le nom en contours (aucune police à installer)", () => {
    for (const nom of ["notre-cuisine-horizontal-color.svg", "notre-cuisine-stacked-color.svg"]) {
      expect(lire("public", "logo", nom)).toContain('id="wordmark"');
    }
  });
});

describe("logo : favicon et icônes de l'appli", () => {
  test("l'icône de l'onglet (src/app/icon.svg) est le logo petite taille, sans fond", () => {
    expect(lire("src", "app", "icon.svg")).toBe(lire("public", "logo", "notre-cuisine-symbol-small-color.svg"));
  });

  test("favicon.ico : un vrai fichier .ico avec 3 tailles (16, 32, 48)", () => {
    const ico = readFileSync(join(racine, "src", "app", "favicon.ico"));
    expect([ico.readUInt16LE(0), ico.readUInt16LE(2)]).toEqual([0, 1]); // en-tête ICO
    expect(ico.readUInt16LE(4)).toBe(3);
  });

  test.each([
    ["public/icon-192.png", 192],
    ["public/icon-512.png", 512],
    ["public/icon-maskable-512.png", 512],
    ["src/app/apple-icon.png", 180],
  ])("%s : une image carrée de %i px", async (chemin, taille) => {
    const { width, height, format } = await sharp(join(racine, chemin)).metadata();
    expect([width, height, format]).toEqual([taille, taille, "png"]);
  });

  test("l'icône « maskable » est pleine (aucun coin transparent) : Android la découpe lui-même", async () => {
    const { data, info } = await sharp(join(racine, "public", "icon-maskable-512.png")).raw().toBuffer({ resolveWithObject: true });
    const alpha = (x: number, y: number) => data[(y * info.width + x) * info.channels + (info.channels - 1)];
    expect([alpha(0, 0), alpha(511, 0), alpha(0, 511), alpha(511, 511)]).toEqual([255, 255, 255, 255]);
  });

  test("l'icône du site (en-tête) pointe vers le nouveau logo", () => {
    expect(lire("src", "components", "SiteHeader.tsx")).toContain("/logo/notre-cuisine-symbol-small-color.svg");
  });
});

// Génère les icônes de l'appli (SVG + PNG) à partir du logo : npm run icons
// Les fichiers générés sont commités ; ce script ne sert qu'à les refaire.
// favicon.ico (16/32/48) a été produit avec le skill logo-design (export_variants.py --web-icons) à partir de
// public/logo/notre-cuisine-symbol-small-color.svg ; il n'est pas régénéré ici.
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

const TERRACOTTA = "#a3400e";
const CREME = "#f8eddb";

// Le carnet du logo (blanc dans le fichier « white »), recoloré en crème : la marmite est un vrai trou, on y voit le fond.
const blanc = readFileSync("public/logo/notre-cuisine-symbol-white.svg", "utf8");
const carnet = blanc
  .slice(blanc.indexOf("</title>") + "</title>".length, blanc.lastIndexOf("</svg>"))
  .replaceAll("#ffffff", CREME);

// Le dessin occupe ~(36..220, 18..244) dans un carré de 256 : on le centre sur (128, 131).
const dessin = (echelle) => `<g transform="translate(256 256) scale(${echelle}) translate(-128 -131)">${carnet}</g>`;
const svg = (fond, contenu) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${fond}${contenu}</svg>`;

// Icône ordinaire : coins arrondis. Icône « maskable » : fond plein, dessin réduit pour rester dans la zone sûre.
const arrondie = svg(`<rect width="512" height="512" rx="112" fill="${TERRACOTTA}"/>`, dessin(1.32));
const maskable = svg(`<rect width="512" height="512" fill="${TERRACOTTA}"/>`, dessin(1.1));

writeFileSync("public/icon.svg", arrondie);
// Onglet du navigateur : le logo petite taille, sans fond (il reste lisible sur un onglet clair ou sombre).
copyFileSync("public/logo/notre-cuisine-symbol-small-color.svg", "src/app/icon.svg");

const png = (source, taille, fichier) => sharp(Buffer.from(source)).resize(taille, taille).png().toFile(fichier);
await Promise.all([
  png(arrondie, 192, "public/icon-192.png"),
  png(arrondie, 512, "public/icon-512.png"),
  png(maskable, 512, "public/icon-maskable-512.png"),
  png(maskable, 180, "src/app/apple-icon.png"),
]);

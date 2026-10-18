// Génère les icônes de l'appli (SVG + PNG) : npm run icons
// Les fichiers générés sont commités ; ce script ne sert qu'à les refaire.
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const ORANGE = "#ea580c";
// Une casserole avec sa vapeur, centrée vers (256, 251) dans un carré de 512.
const CASSEROLE = `
  <g fill="#fff">
    <rect x="120" y="214" width="272" height="30" rx="15"/>
    <circle cx="256" cy="196" r="20"/>
    <path d="M136 252h240v84a72 72 0 0 1-72 72H208a72 72 0 0 1-72-72z"/>
    <rect x="88" y="268" width="48" height="24" rx="12"/>
    <rect x="376" y="268" width="48" height="24" rx="12"/>
  </g>
  <g fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round">
    <path d="M206 160c-14-20 14-30 0-52"/>
    <path d="M256 146c-14-20 14-30 0-52"/>
    <path d="M306 160c-14-20 14-30 0-52"/>
  </g>`;

const svg = (fond, dessin) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${fond}${dessin}</svg>`;

// Icône ordinaire : coins arrondis. Icône « maskable » : fond plein, dessin réduit pour rester dans la zone sûre.
const arrondie = svg(`<rect width="512" height="512" rx="112" fill="${ORANGE}"/>`, CASSEROLE);
const maskable = svg(
  `<rect width="512" height="512" fill="${ORANGE}"/>`,
  `<g transform="translate(256 256) scale(0.74) translate(-256 -251)">${CASSEROLE}</g>`,
);

writeFileSync("public/icon.svg", arrondie);
writeFileSync("src/app/icon.svg", arrondie);
const png = (source, taille, fichier) => sharp(Buffer.from(source)).resize(taille, taille).png().toFile(fichier);
await Promise.all([
  png(arrondie, 192, "public/icon-192.png"),
  png(arrondie, 512, "public/icon-512.png"),
  png(maskable, 512, "public/icon-maskable-512.png"),
  png(maskable, 180, "src/app/apple-icon.png"),
]);
console.log("Icônes générées.");

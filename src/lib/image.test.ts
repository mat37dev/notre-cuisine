import { describe, expect, test } from "vitest";
import { adresseImageValide, detectImageType, MAX_IMAGE_BYTES } from "./image";

const octets = (...n: number[]) => new Uint8Array(n);
const texte = (s: string) => new TextEncoder().encode(s);

describe("detectImageType (on regarde le contenu, pas ce que le navigateur annonce)", () => {
  test("JPEG", () => {
    expect(detectImageType(octets(0xff, 0xd8, 0xff, 0xe0, 0, 0x10))).toBe("image/jpeg");
  });

  test("PNG", () => {
    expect(detectImageType(octets(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe("image/png");
  });

  test("WebP", () => {
    const webp = new Uint8Array([...texte("RIFF"), 1, 2, 3, 4, ...texte("WEBPVP8 ")]);
    expect(detectImageType(webp)).toBe("image/webp");
  });

  test("SVG, HTML, GIF, texte, vide : refusés (un SVG peut contenir du code)", () => {
    expect(detectImageType(texte('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).toBeNull();
    expect(detectImageType(texte("<!doctype html><html></html>"))).toBeNull();
    expect(detectImageType(texte("GIF89a"))).toBeNull();
    expect(detectImageType(texte("bonjour"))).toBeNull();
    expect(detectImageType(new Uint8Array())).toBeNull();
  });

  test("RIFF qui n'est pas du WebP (un fichier audio, par exemple) : refusé", () => {
    expect(detectImageType(new Uint8Array([...texte("RIFF"), 1, 2, 3, 4, ...texte("WAVEfmt ")]))).toBeNull();
  });

  test("taille maximale : 1,5 Mo", () => {
    expect(MAX_IMAGE_BYTES).toBe(1_500_000);
  });
});

describe("adresseImageValide : l'adresse d'une image donnée à la main ou choisie par Claude", () => {
  test("une adresse https est acceptée, les espaces autour sont retirés", () => {
    expect(adresseImageValide("  https://upload.wikimedia.org/a/b/tarte.jpg ")).toBe("https://upload.wikimedia.org/a/b/tarte.jpg");
    expect(adresseImageValide("https://exemple.fr/photo?id=3&w=800")).toBe("https://exemple.fr/photo?id=3&w=800");
  });

  test("http, javascript:, data:, ftp, texte libre, vide : refusés", () => {
    for (const mauvais of ["http://exemple.fr/a.jpg", "javascript:alert(1)", "data:image/png;base64,AAAA", "ftp://x.fr/a.jpg", "une tarte", "", "   "]) {
      expect(adresseImageValide(mauvais), mauvais).toBeNull();
    }
  });

  test("une adresse avec un espace au milieu ou de plus de 500 caractères : refusée", () => {
    expect(adresseImageValide("https://exemple.fr/ma tarte.jpg")).toBeNull();
    expect(adresseImageValide(`https://exemple.fr/${"a".repeat(482)}`)).toBeNull();
    expect(adresseImageValide(`https://exemple.fr/${"a".repeat(481)}`)).not.toBeNull();
  });

  test("« https:// » seul ou sans nom de site : refusé", () => {
    expect(adresseImageValide("https://")).toBeNull();
    expect(adresseImageValide("https:///a.jpg")).toBeNull();
  });
});

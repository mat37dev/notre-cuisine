import { describe, expect, test } from "vitest";
import { detectImageType, MAX_IMAGE_BYTES } from "./image";

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

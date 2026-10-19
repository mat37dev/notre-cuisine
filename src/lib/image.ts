/** Taille maximale d'une photo envoyée (après réduction dans le navigateur, une photo fait ~200 Ko). */
export const MAX_IMAGE_BYTES = 1_500_000;

export type TypeImage = "image/jpeg" | "image/png" | "image/webp";

const ascii = (o: Uint8Array, debut: number, fin: number) => String.fromCharCode(...o.slice(debut, fin));

/**
 * Type réel d'une image d'après ses premiers octets, ou null si ce n'est pas du JPEG, PNG ou WebP.
 * On ne se fie jamais au type annoncé par le navigateur, et le SVG (qui peut contenir du code) est refusé.
 */
export function detectImageType(octets: Uint8Array): TypeImage | null {
  if (octets.length >= 3 && octets[0] === 0xff && octets[1] === 0xd8 && octets[2] === 0xff) return "image/jpeg";
  if (
    octets.length >= 8 &&
    octets[0] === 0x89 &&
    octets[1] === 0x50 &&
    octets[2] === 0x4e &&
    octets[3] === 0x47 &&
    octets[4] === 0x0d &&
    octets[5] === 0x0a &&
    octets[6] === 0x1a &&
    octets[7] === 0x0a
  ) {
    return "image/png";
  }
  if (octets.length >= 12 && ascii(octets, 0, 4) === "RIFF" && ascii(octets, 8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Longueur maximale de l'adresse d'une image (la même que dans le format de recette). */
export const MAX_ADRESSE_IMAGE = 500;

/** L'adresse nettoyée si c'est une adresse https d'image utilisable, sinon null. */
export function adresseImageValide(texte: string): string | null {
  const adresse = texte.trim();
  if (!adresse || adresse.length > MAX_ADRESSE_IMAGE || !/^https:\/\/[^\s/]\S*$/.test(adresse)) return null;
  try {
    return new URL(adresse).hostname ? adresse : null;
  } catch {
    return null;
  }
}

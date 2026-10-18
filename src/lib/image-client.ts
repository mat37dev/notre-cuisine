/**
 * Réduit une photo dans le navigateur avant l'envoi : côté le plus long limité à `cote` pixels, JPEG.
 * Une photo de téléphone de 5 Mo devient une image d'environ 150 Ko.
 */
export async function redimensionner(fichier: File, cote = 1200): Promise<Blob> {
  const image = await createImageBitmap(fichier, { imageOrientation: "from-image" });
  const echelle = Math.min(1, cote / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * echelle);
  canvas.height = Math.round(image.height * echelle);
  const contexte = canvas.getContext("2d");
  if (!contexte) throw new Error("canvas indisponible");
  contexte.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.82));
  if (!blob) throw new Error("conversion impossible");
  return blob;
}

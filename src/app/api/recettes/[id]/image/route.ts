import { adresseImageValide, detectImageType, MAX_IMAGE_BYTES } from "@/lib/image";
import { json, refusJeton, viewerFromRequest } from "@/lib/http";
import { canEdit } from "@/lib/service";
import { getStore } from "@/lib/store";

type Contexte = { params: Promise<{ id: string }> };

const REFUS = { erreur: "Tu n'as pas le droit de modifier cette recette." };
const INTROUVABLE = { erreur: "Recette introuvable." };

/** Ajoute ou remplace la photo d'une recette : son auteur (membre) ou l'admin. */
export async function POST(request: Request, ctx: Contexte) {
  const { id } = await ctx.params;
  const store = getStore();
  const viewer = await viewerFromRequest(request, store);
  const refus = refusJeton(viewer);
  if (refus) return refus;
  if (viewer.role === "visitor") return json(REFUS, 403);

  const row = await store.getRecipe(id);
  if (!row) return json(INTROUVABLE, 404);
  if (!canEdit(viewer, row)) return json(REFUS, 403);

  // l'en-tête permet de refuser sans lire un fichier énorme ; la vraie taille est revérifiée plus bas
  if (Number(request.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES + 100_000) {
    return json({ erreur: "Cette image est trop lourde (1,5 Mo au maximum)." }, 413);
  }
  const form = await request.formData().catch(() => null);
  const fichier = form?.get("image");
  if (!(fichier instanceof Blob)) return json({ erreur: "Il manque l'image." }, 400);
  if (fichier.size > MAX_IMAGE_BYTES) return json({ erreur: "Cette image est trop lourde (1,5 Mo au maximum)." }, 413);

  const octets = new Uint8Array(await fichier.arrayBuffer());
  const type = detectImageType(octets);
  if (!type) return json({ erreur: "Ce fichier n'est pas une image JPEG, PNG ou WebP." }, 415);

  let image: string;
  try {
    image = await store.putImage(row.id, octets, type);
  } catch {
    return json({ erreur: "Le stockage des images n'est pas prêt : il manque peut-être la migration Supabase." }, 503);
  }
  await store.updateRecipe(row.id, { recipe: { ...row.recipe, image } });
  return json({ image });
}

/**
 * Change la photo d'une recette avec une simple adresse : `{"url": "https://…"}`.
 * L'éventuelle photo envoyée depuis un appareil est alors supprimée du stockage.
 */
export async function PUT(request: Request, ctx: Contexte) {
  const { id } = await ctx.params;
  const store = getStore();
  const viewer = await viewerFromRequest(request, store);
  const refus = refusJeton(viewer);
  if (refus) return refus;
  if (viewer.role === "visitor") return json(REFUS, 403);

  const row = await store.getRecipe(id);
  if (!row) return json(INTROUVABLE, 404);
  if (!canEdit(viewer, row)) return json(REFUS, 403);

  const corps = (await request.json().catch(() => null)) as { url?: unknown } | null;
  const image = typeof corps?.url === "string" ? adresseImageValide(corps.url) : null;
  if (!image) {
    return json({ erreur: "Il faut l'adresse d'une image, commençant par https:// (500 caractères au maximum)." }, 400);
  }

  await store.deleteImage(row.id).catch(() => {}); // l'ancienne photo envoyée n'a plus lieu d'être gardée
  await store.updateRecipe(row.id, { recipe: { ...row.recipe, image } });
  return json({ image });
}

/** Retire la photo d'une recette. */
export async function DELETE(request: Request, ctx: Contexte) {
  const { id } = await ctx.params;
  const store = getStore();
  const viewer = await viewerFromRequest(request, store);
  const refus = refusJeton(viewer);
  if (refus) return refus;
  if (viewer.role === "visitor") return json(REFUS, 403);

  const row = await store.getRecipe(id);
  if (!row) return json(INTROUVABLE, 404);
  if (!canEdit(viewer, row)) return json(REFUS, 403);

  await store.deleteImage(row.id).catch(() => {}); // une photo absente du stockage n'est pas une erreur
  const { image: _retiree, ...sansImage } = row.recipe;
  await store.updateRecipe(row.id, { recipe: sansImage });
  return json({ ok: true });
}

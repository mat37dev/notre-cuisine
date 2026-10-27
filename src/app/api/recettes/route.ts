import { clientIpHash, json, refusJeton, viewerFromRequest } from "@/lib/http";
import { parseRecipeBlock } from "@/lib/recipe/parse";
import { MAX_PAYLOAD_BYTES } from "@/lib/recipe/types";
import { listPublished, submitRecipe } from "@/lib/service";
import { getStore } from "@/lib/store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const store = getStore();
  const [rows, toutes] = await Promise.all([
    listPublished(store, searchParams.get("q") ?? "", searchParams.get("categorie") ?? undefined),
    listPublished(store),
  ]);
  const slugs = new Map(toutes.map((r) => [r.id, r.slug]));
  return json(
    rows.map((r) => {
      const reference = r.varianteDe ? slugs.get(r.varianteDe) : undefined;
      return {
        id: r.id,
        slug: r.slug,
        titre: r.recipe.titre,
        description: r.recipe.description ?? "",
        categorie: r.recipe.categorie,
        ...(r.recipe.nom_variante && { nom_variante: r.recipe.nom_variante }),
        ...(reference && { variante_de: reference }),
      };
    }),
  );
}

const ERREURS = {
  forbidden: [403, "Tu n'as pas le droit de faire ça."],
  not_found: [404, "Recette introuvable."],
  rate_limited: [429, "Trop d'envois pour le moment, réessaie plus tard."],
  too_large: [413, "Cette recette est trop volumineuse."],
} as const;

export async function POST(request: Request) {
  const store = getStore();
  const viewer = await viewerFromRequest(request, store);
  const refus = refusJeton(viewer); // un jeton faux est dit tout de suite, avant de lire le reste
  if (refus) return refus;
  if (Number(request.headers.get("content-length") ?? 0) > 2 * MAX_PAYLOAD_BYTES) {
    return json({ errors: [ERREURS.too_large[1]] }, 413);
  }
  const brut = await request.text();
  if (Buffer.byteLength(brut, "utf8") > 2 * MAX_PAYLOAD_BYTES) return json({ errors: [ERREURS.too_large[1]] }, 413);

  let texte: unknown;
  try {
    texte = (JSON.parse(brut) as { texte?: unknown }).texte;
  } catch {
    return json({ errors: ["La requête n'est pas du JSON valide."] }, 400);
  }
  if (typeof texte !== "string") return json({ errors: ["Il manque le champ « texte »."] }, 400);
  if (Buffer.byteLength(texte, "utf8") > MAX_PAYLOAD_BYTES) return json({ errors: [ERREURS.too_large[1]] }, 413);

  const lu = parseRecipeBlock(texte);
  if (!lu.ok) return json({ errors: lu.errors }, 422);

  const res = await submitRecipe(store, viewer, lu.recipe, { ipHash: clientIpHash(request) });
  if (!res.ok) {
    if (res.code === "variante_introuvable") {
      return json({ errors: [`La recette « ${lu.recipe.variante_de} » indiquée dans variante_de est introuvable.`] }, 422);
    }
    const [status, message] = ERREURS[res.code];
    return json({ errors: [message] }, status);
  }
  const { id, slug, status, varianteDe } = res.value;
  const reference = varianteDe ? await store.getRecipe(varianteDe) : null;
  const misAJour = Boolean(lu.recipe.id);
  return json(
    {
      id,
      slug,
      status,
      avertissements: lu.warnings,
      lien: `/recettes/${slug}`,
      ...(reference && { variante_de: { slug: reference.slug, titre: reference.recipe.titre } }),
    },
    misAJour ? 200 : status === "published" ? 201 : 202,
  );
}

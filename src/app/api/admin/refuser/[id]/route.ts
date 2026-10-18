import { requireAdmin } from "@/lib/admin-api";
import { json } from "@/lib/http";
import { removeRecipe } from "@/lib/service";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.res;
  const { id } = await ctx.params;
  const res = await removeRecipe(admin.store, admin.viewer, id);
  return res.ok ? json({ ok: true }) : json({ erreur: "Recette introuvable." }, 404);
}

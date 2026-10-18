import { requireAdmin } from "@/lib/admin-api";
import { exportAll } from "@/lib/service";

/** Sauvegarde : toutes les recettes (publiées et en attente) en un fichier JSON. */
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.res;
  const res = await exportAll(admin.store, admin.viewer);
  if (!res.ok) return Response.json({ erreur: "Réservé à l'administrateur." }, { status: 403 });
  const jour = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(res.value, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="recettes-${jour}.json"`,
      "cache-control": "no-store",
    },
  });
}

import { requireAdmin } from "@/lib/admin-api";
import { json } from "@/lib/http";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return admin.res;
  const { id } = await ctx.params;
  await admin.store.revokeDevice(id, new Date().toISOString());
  return json({ ok: true });
}

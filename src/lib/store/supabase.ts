import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { makeSlug } from "../recipe/slug";
import type { Recipe } from "../recipe/types";
import type { ClaimResult, Device, Profile, RecipeRow, Role, Status, Store } from "./types";

type DbRecipe = {
  id: string;
  slug: string;
  status: Status;
  author_id: string | null;
  data: Recipe;
  created_at: string;
  updated_at: string;
};
type DbDevice = {
  id: string;
  profile_id: string;
  label: string;
  created_at: string;
  last_seen_at: string;
  revoked_at: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ok<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Base de données : ${res.error.message}`);
  return res.data;
}

const toRow = (r: DbRecipe): RecipeRow => ({
  id: r.id,
  slug: r.slug,
  status: r.status,
  authorId: r.author_id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  recipe: { ...r.data, id: r.id },
});

const toDevice = (d: DbDevice): Device => ({
  id: d.id,
  profileId: d.profile_id,
  label: d.label,
  createdAt: d.created_at,
  lastSeenAt: d.last_seen_at,
  revokedAt: d.revoked_at,
});

function sansId(r: Recipe): Recipe {
  const copie = { ...r };
  delete copie.id;
  return copie;
}

/** Stockage Supabase (Postgres). À utiliser côté serveur uniquement, avec la clé « service role ». */
export class SupabaseStore implements Store {
  private db: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  async insertRecipe(input: { status: Status; authorId: string | null; recipe: Recipe }): Promise<RecipeRow> {
    const base = (await this.slugsExistants(input.recipe.titre)) ?? new Set<string>();
    for (let essai = 0; essai < 5; essai++) {
      const slug = makeSlug(input.recipe.titre, base);
      const res = await this.db
        .from("recipes")
        .insert({ slug, status: input.status, author_id: input.authorId, data: sansId(input.recipe) })
        .select()
        .single();
      if (res.error?.code === "23505") {
        base.add(slug);
        continue;
      }
      return toRow(ok(res) as DbRecipe);
    }
    throw new Error("Base de données : impossible de trouver une adresse libre pour cette recette.");
  }

  private async slugsExistants(titre: string): Promise<Set<string> | null> {
    const debut = makeSlug(titre, new Set());
    const res = await this.db.from("recipes").select("slug").like("slug", `${debut}%`);
    return new Set((ok(res) as Array<{ slug: string }>).map((r) => r.slug));
  }

  async updateRecipe(id: string, patch: { status?: Status; recipe?: Recipe }): Promise<RecipeRow | null> {
    if (!UUID.test(id)) return null;
    const maj: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.status) maj.status = patch.status;
    if (patch.recipe) maj.data = sansId(patch.recipe);
    const res = await this.db.from("recipes").update(maj).eq("id", id).select().maybeSingle();
    const row = ok(res) as DbRecipe | null;
    return row ? toRow(row) : null;
  }

  async getRecipe(idOrSlug: string): Promise<RecipeRow | null> {
    const res = await this.db
      .from("recipes")
      .select()
      .eq(UUID.test(idOrSlug) ? "id" : "slug", idOrSlug)
      .maybeSingle();
    const row = ok(res) as DbRecipe | null;
    return row ? toRow(row) : null;
  }

  async listRecipes(filter: { status?: Status } = {}): Promise<RecipeRow[]> {
    let q = this.db.from("recipes").select().order("created_at", { ascending: false });
    if (filter.status) q = q.eq("status", filter.status);
    return (ok(await q) as DbRecipe[]).map(toRow);
  }

  async deleteRecipe(id: string): Promise<boolean> {
    if (!UUID.test(id)) return false;
    const res = await this.db.from("recipes").delete().eq("id", id).select("id");
    return (ok(res) as unknown[]).length > 0;
  }

  async createProfile(name: string, role: Role): Promise<Profile> {
    const res = await this.db.from("profiles").insert({ name, role }).select().single();
    return ok(res) as Profile;
  }

  async getProfile(id: string): Promise<Profile | null> {
    if (!UUID.test(id)) return null;
    const res = await this.db.from("profiles").select("id, name, role").eq("id", id).maybeSingle();
    return ok(res) as Profile | null;
  }

  async createInvite(profileId: string, label: string, tokenHash: string, expiresAt: string): Promise<void> {
    ok(
      await this.db
        .from("invites")
        .insert({ profile_id: profileId, label, token_hash: tokenHash, expires_at: expiresAt }),
    );
  }

  async claimInvite(tokenHash: string, deviceTokenHash: string, nowIso: string): Promise<ClaimResult> {
    const trouvee = ok(
      await this.db.from("invites").select().eq("token_hash", tokenHash).maybeSingle(),
    ) as { id: string; profile_id: string; label: string; expires_at: string; claimed_at: string | null } | null;
    if (!trouvee) return { status: "invalide" };
    if (trouvee.claimed_at) return { status: "utilisee" };
    if (Date.parse(trouvee.expires_at) < Date.parse(nowIso)) return { status: "expiree" };

    // « réclamer » est atomique : un seul appel peut passer claimed_at de null à une date
    const prise = ok(
      await this.db
        .from("invites")
        .update({ claimed_at: nowIso })
        .eq("id", trouvee.id)
        .is("claimed_at", null)
        .select("id"),
    ) as unknown[];
    if (prise.length === 0) return { status: "utilisee" };

    const device = ok(
      await this.db
        .from("devices")
        .insert({
          profile_id: trouvee.profile_id,
          label: trouvee.label,
          token_hash: deviceTokenHash,
          created_at: nowIso,
          last_seen_at: nowIso,
        })
        .select()
        .single(),
    ) as DbDevice;
    return { status: "ok", device: toDevice(device) };
  }

  async findDevice(tokenHash: string): Promise<{ device: Device; profile: Profile } | null> {
    const res = await this.db
      .from("devices")
      .select("*, profiles(id, name, role)")
      .eq("token_hash", tokenHash)
      .is("revoked_at", null)
      .maybeSingle();
    const row = ok(res) as (DbDevice & { profiles: Profile | null }) | null;
    return row?.profiles ? { device: toDevice(row), profile: row.profiles } : null;
  }

  async touchDevice(id: string, nowIso: string): Promise<void> {
    ok(await this.db.from("devices").update({ last_seen_at: nowIso }).eq("id", id));
  }

  async listDevices(): Promise<Array<Device & { profileName: string }>> {
    const res = await this.db.from("devices").select("*, profiles(name)").order("created_at");
    return (ok(res) as Array<DbDevice & { profiles: { name: string } | null }>).map((d) => ({
      ...toDevice(d),
      profileName: d.profiles?.name ?? "",
    }));
  }

  async revokeDevice(id: string, nowIso: string): Promise<void> {
    ok(await this.db.from("devices").update({ revoked_at: nowIso }).eq("id", id).is("revoked_at", null));
  }

  async countSubmissions(ipHash: string, sinceIso: string): Promise<number> {
    const res = await this.db
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", sinceIso);
    if (res.error) throw new Error(`Base de données : ${res.error.message}`);
    return res.count ?? 0;
  }

  async logSubmission(ipHash: string, nowIso: string): Promise<void> {
    ok(await this.db.from("submissions").insert({ ip_hash: ipHash, created_at: nowIso }));
  }

  async ping(): Promise<void> {
    ok(await this.db.from("profiles").select("id").limit(1));
  }
}

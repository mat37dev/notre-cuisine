import { makeSlug } from "../recipe/slug";
import type { Recipe } from "../recipe/types";
import type { ClaimResult, Device, Profile, RecipeRow, Role, Status, Store } from "./types";

type Invite = {
  tokenHash: string;
  profileId: string;
  label: string;
  expiresAt: string;
  claimed: boolean;
};

const sansId = (r: Recipe): Recipe => {
  const copie = structuredClone(r);
  delete copie.id;
  return copie;
};

/** Stockage en mémoire : pour les tests et le développement sans base. */
export class MemoryStore implements Store {
  private recipes: RecipeRow[] = [];
  private profiles: Profile[] = [];
  private invites: Invite[] = [];
  private devices: Array<Device & { tokenHash: string }> = [];
  private submissions: Array<{ ipHash: string; at: string }> = [];

  private vue(row: RecipeRow): RecipeRow {
    return { ...row, recipe: { ...structuredClone(row.recipe), id: row.id } };
  }

  async insertRecipe(input: { status: Status; authorId: string | null; recipe: Recipe }): Promise<RecipeRow> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const row: RecipeRow = {
      id,
      slug: makeSlug(input.recipe.titre, new Set(this.recipes.map((r) => r.slug))),
      status: input.status,
      authorId: input.authorId,
      createdAt: now,
      updatedAt: now,
      recipe: sansId(input.recipe),
    };
    this.recipes.push(row);
    return this.vue(row);
  }

  async updateRecipe(id: string, patch: { status?: Status; recipe?: Recipe }): Promise<RecipeRow | null> {
    const row = this.recipes.find((r) => r.id === id);
    if (!row) return null;
    if (patch.status) row.status = patch.status;
    if (patch.recipe) row.recipe = sansId(patch.recipe);
    row.updatedAt = new Date().toISOString();
    return this.vue(row);
  }

  async getRecipe(idOrSlug: string): Promise<RecipeRow | null> {
    const row = this.recipes.find((r) => r.id === idOrSlug) ?? this.recipes.find((r) => r.slug === idOrSlug);
    return row ? this.vue(row) : null;
  }

  async listRecipes(filter: { status?: Status } = {}): Promise<RecipeRow[]> {
    return this.recipes
      .filter((r) => !filter.status || r.status === filter.status)
      .map((r) => this.vue(r))
      .reverse();
  }

  async deleteRecipe(id: string): Promise<boolean> {
    const avant = this.recipes.length;
    this.recipes = this.recipes.filter((r) => r.id !== id);
    return this.recipes.length < avant;
  }

  async putImage(_recipeId: string, octets: Uint8Array, contentType: string): Promise<string> {
    return `data:${contentType};base64,${Buffer.from(octets).toString("base64")}`;
  }

  async deleteImage(): Promise<void> {}

  async createProfile(name: string, role: Role): Promise<Profile> {
    const profil = { id: crypto.randomUUID(), name, role };
    this.profiles.push(profil);
    return { ...profil };
  }

  async getProfile(id: string): Promise<Profile | null> {
    const p = this.profiles.find((x) => x.id === id);
    return p ? { ...p } : null;
  }

  async listProfiles(): Promise<Profile[]> {
    return this.profiles.map((p) => ({ ...p }));
  }

  async createInvite(profileId: string, label: string, tokenHash: string, expiresAt: string): Promise<void> {
    this.invites.push({ tokenHash, profileId, label, expiresAt, claimed: false });
  }

  async claimInvite(tokenHash: string, deviceTokenHash: string, nowIso: string): Promise<ClaimResult> {
    const invite = this.invites.find((i) => i.tokenHash === tokenHash);
    if (!invite) return { status: "invalide" };
    if (invite.claimed) return { status: "utilisee" };
    if (invite.expiresAt < nowIso) return { status: "expiree" };
    invite.claimed = true;
    const device = {
      id: crypto.randomUUID(),
      profileId: invite.profileId,
      label: invite.label,
      kind: "appareil" as const,
      createdAt: nowIso,
      lastSeenAt: nowIso,
      revokedAt: null,
      tokenHash: deviceTokenHash,
    };
    this.devices.push(device);
    return { status: "ok", device: this.publicDevice(device) };
  }

  async createToken(profileId: string, label: string, tokenHash: string, nowIso: string): Promise<Device> {
    const device = {
      id: crypto.randomUUID(),
      profileId,
      label,
      kind: "jeton" as const,
      createdAt: nowIso,
      lastSeenAt: nowIso,
      revokedAt: null,
      tokenHash,
    };
    this.devices.push(device);
    return this.publicDevice(device);
  }

  private publicDevice(d: Device & { tokenHash: string }): Device {
    const { tokenHash: _tokenHash, ...device } = d;
    return device;
  }

  async findDevice(tokenHash: string): Promise<{ device: Device; profile: Profile } | null> {
    const d = this.devices.find((x) => x.tokenHash === tokenHash && x.revokedAt === null);
    const profile = d && this.profiles.find((p) => p.id === d.profileId);
    return d && profile ? { device: this.publicDevice(d), profile: { ...profile } } : null;
  }

  async touchDevice(id: string, nowIso: string): Promise<void> {
    const d = this.devices.find((x) => x.id === id);
    if (d) d.lastSeenAt = nowIso;
  }

  async listDevices(): Promise<Array<Device & { profileName: string }>> {
    return this.devices.map((d) => ({
      ...this.publicDevice(d),
      profileName: this.profiles.find((p) => p.id === d.profileId)?.name ?? "",
    }));
  }

  async revokeDevice(id: string, nowIso: string): Promise<void> {
    const d = this.devices.find((x) => x.id === id);
    if (d && d.revokedAt === null) d.revokedAt = nowIso;
  }

  async countSubmissions(ipHash: string, sinceIso: string): Promise<number> {
    return this.submissions.filter((s) => s.ipHash === ipHash && s.at >= sinceIso).length;
  }

  async logSubmission(ipHash: string, nowIso: string): Promise<void> {
    this.submissions.push({ ipHash, at: nowIso });
  }

  async ping(): Promise<void> {}
}

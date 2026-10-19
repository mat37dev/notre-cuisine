import type { Recipe } from "../recipe/types";

export type Role = "admin" | "member";
export type Status = "published" | "pending";

export type RecipeRow = {
  id: string;
  slug: string;
  status: Status;
  authorId: string | null;
  createdAt: string;
  updatedAt: string;
  /** `recipe.id` vaut toujours `id`. */
  recipe: Recipe;
};

export type Profile = { id: string; name: string; role: Role };

export type Device = {
  id: string;
  profileId: string;
  label: string;
  createdAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
};

export type ClaimResult =
  | { status: "ok"; device: Device }
  | { status: "invalide" | "expiree" | "utilisee" };

export interface Store {
  insertRecipe(input: { status: Status; authorId: string | null; recipe: Recipe }): Promise<RecipeRow>;
  updateRecipe(id: string, patch: { status?: Status; recipe?: Recipe }): Promise<RecipeRow | null>;
  getRecipe(idOrSlug: string): Promise<RecipeRow | null>;
  listRecipes(filter?: { status?: Status }): Promise<RecipeRow[]>;
  deleteRecipe(id: string): Promise<boolean>;
  /** Enregistre la photo d'une recette et renvoie son adresse publique. */
  putImage(recipeId: string, octets: Uint8Array, contentType: string): Promise<string>;
  deleteImage(recipeId: string): Promise<void>;

  createProfile(name: string, role: Role): Promise<Profile>;
  getProfile(id: string): Promise<Profile | null>;
  listProfiles(): Promise<Profile[]>;

  createInvite(profileId: string, label: string, tokenHash: string, expiresAt: string): Promise<void>;
  claimInvite(tokenHash: string, deviceTokenHash: string, nowIso: string): Promise<ClaimResult>;
  /** `null` si le jeton est inconnu ou si l'appareil a été retiré. */
  findDevice(tokenHash: string): Promise<{ device: Device; profile: Profile } | null>;
  touchDevice(id: string, nowIso: string): Promise<void>;
  listDevices(): Promise<Array<Device & { profileName: string }>>;
  revokeDevice(id: string, nowIso: string): Promise<void>;

  countSubmissions(ipHash: string, sinceIso: string): Promise<number>;
  logSubmission(ipHash: string, nowIso: string): Promise<void>;

  ping(): Promise<void>;
}

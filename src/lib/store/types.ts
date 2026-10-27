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
  /** Id de la recette de référence du plat si c'est une variante, sinon `null` (jamais une autre variante). */
  varianteDe: string | null;
  /** `recipe.id` vaut toujours `id`. `recipe.variante_de` n'y est jamais : le lien est `varianteDe`. */
  recipe: Recipe;
};

export type Profile = { id: string; name: string; role: Role };

/** « appareil » : reconnu par un cookie. « jeton » : clé d'accès à donner à Claude, envoyée dans l'en-tête Authorization. */
export type DeviceKind = "appareil" | "jeton";

export type Device = {
  id: string;
  profileId: string;
  label: string;
  kind: DeviceKind;
  createdAt: string;
  lastSeenAt: string;
  revokedAt: string | null;
};

export type ClaimResult =
  | { status: "ok"; device: Device }
  | { status: "invalide" | "expiree" | "utilisee" };

export interface Store {
  insertRecipe(input: {
    status: Status;
    authorId: string | null;
    recipe: Recipe;
    varianteDe?: string | null;
  }): Promise<RecipeRow>;
  /** Une clé absente du patch ne change rien ; `varianteDe: null` détache la recette. */
  updateRecipe(
    id: string,
    patch: { status?: Status; recipe?: Recipe; varianteDe?: string | null },
  ): Promise<RecipeRow | null>;
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
  /** Enregistre un jeton d'accès (on ne reçoit que son empreinte). */
  createToken(profileId: string, label: string, tokenHash: string, nowIso: string): Promise<Device>;
  touchDevice(id: string, nowIso: string): Promise<void>;
  listDevices(): Promise<Array<Device & { profileName: string }>>;
  revokeDevice(id: string, nowIso: string): Promise<void>;

  countSubmissions(ipHash: string, sinceIso: string): Promise<number>;
  logSubmission(ipHash: string, nowIso: string): Promise<void>;

  ping(): Promise<void>;
}

import { beforeEach, describe, expect, test } from "vitest";
import { uneRecette } from "../recipe/fixtures";
import type { Store } from "./types";

const T0 = "2026-10-18T10:00:00.000Z";
const plusTard = (minutes: number) => new Date(Date.parse(T0) + minutes * 60_000).toISOString();
const ID_INCONNU = "00000000-0000-4000-8000-000000000000";

/** Tests communs à toutes les implémentations de `Store`. */
export function runStoreContract(name: string, make: () => Promise<Store>) {
  describe(`Store (${name})`, () => {
    let store: Store;
    beforeEach(async () => {
      store = await make();
    });

    describe("recettes", () => {
      test("insère puis relit par id et par slug, l'id de la recette est celui de la ligne", async () => {
        const row = await store.insertRecipe({ status: "pending", authorId: null, recipe: uneRecette() });
        expect(row.slug).toBe("salade-burrata");
        expect(row.status).toBe("pending");
        expect(row.recipe.id).toBe(row.id);
        expect((await store.getRecipe(row.id))?.recipe.titre).toBe("Salade burrata");
        expect((await store.getRecipe("salade-burrata"))?.id).toBe(row.id);
        expect(await store.getRecipe("inconnu")).toBeNull();
      });

      test("garde l'auteur", async () => {
        const profil = await store.createProfile("Camille", "member");
        const row = await store.insertRecipe({ status: "published", authorId: profil.id, recipe: uneRecette() });
        expect(row.authorId).toBe(profil.id);
      });

      test("deux recettes au même titre ont des slugs différents", async () => {
        const a = await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette() });
        const b = await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette() });
        expect(a.slug).toBe("salade-burrata");
        expect(b.slug).toBe("salade-burrata-2");
      });

      test("listRecipes filtre par statut", async () => {
        await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette({ titre: "A" }) });
        await store.insertRecipe({ status: "pending", authorId: null, recipe: uneRecette({ titre: "B" }) });
        const publiees = await store.listRecipes({ status: "published" });
        expect(publiees.map((r) => r.recipe.titre)).toEqual(["A"]);
        expect(await store.listRecipes()).toHaveLength(2);
      });

      test("updateRecipe change le statut et le contenu, garde le slug", async () => {
        const row = await store.insertRecipe({ status: "pending", authorId: null, recipe: uneRecette() });
        const maj = await store.updateRecipe(row.id, {
          status: "published",
          recipe: uneRecette({ titre: "Autre titre" }),
        });
        expect(maj?.slug).toBe("salade-burrata");
        expect(maj?.status).toBe("published");
        expect(maj?.recipe.titre).toBe("Autre titre");
        expect(maj?.recipe.id).toBe(row.id);
        expect(maj!.updatedAt >= row.createdAt).toBe(true);
      });

      test("updateRecipe sur un id inconnu : null", async () => {
        expect(await store.updateRecipe(ID_INCONNU, { status: "published" })).toBeNull();
      });

      test("deleteRecipe renvoie true puis false", async () => {
        const row = await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette() });
        expect(await store.deleteRecipe(row.id)).toBe(true);
        expect(await store.deleteRecipe(row.id)).toBe(false);
        expect(await store.getRecipe(row.id)).toBeNull();
      });
    });

    describe("images", () => {
      const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

      test("putImage renvoie une adresse, deleteImage ne lève pas d'erreur (même sans image)", async () => {
        const row = await store.insertRecipe({ status: "published", authorId: null, recipe: uneRecette() });
        const url = await store.putImage(row.id, jpeg, "image/jpeg");
        expect(url).toMatch(/^(https?:\/\/|data:|\/)/);
        await expect(store.deleteImage(row.id)).resolves.toBeUndefined();
        await expect(store.deleteImage(row.id)).resolves.toBeUndefined();
      });
    });

    describe("profils, invitations et appareils", () => {
      test("relit un profil", async () => {
        const p = await store.createProfile("Mathieu", "admin");
        expect(await store.getProfile(p.id)).toEqual({ id: p.id, name: "Mathieu", role: "admin" });
        expect(await store.getProfile(ID_INCONNU)).toBeNull();
      });

      test("listProfiles renvoie tous les profils", async () => {
        const a = await store.createProfile("Mathieu", "admin");
        const b = await store.createProfile("Camille", "member");
        const liste = await store.listProfiles();
        expect(liste).toHaveLength(2);
        expect(liste).toEqual(expect.arrayContaining([a, b]));
      });

      test("une invitation se réclame une seule fois", async () => {
        const p = await store.createProfile("Camille", "member");
        await store.createInvite(p.id, "Téléphone", "hash-invite", plusTard(60));
        const r1 = await store.claimInvite("hash-invite", "hash-appareil", T0);
        expect(r1.status).toBe("ok");
        if (r1.status === "ok") {
          expect(r1.device.profileId).toBe(p.id);
          expect(r1.device.label).toBe("Téléphone");
        }
        const r2 = await store.claimInvite("hash-invite", "hash-appareil-2", T0);
        expect(r2).toEqual({ status: "utilisee" });
      });

      test("une invitation expirée : expiree", async () => {
        const p = await store.createProfile("Camille", "member");
        await store.createInvite(p.id, "Vieux lien", "hash-vieux", plusTard(-1));
        expect(await store.claimInvite("hash-vieux", "hash-appareil", T0)).toEqual({ status: "expiree" });
      });

      test("un jeton inconnu : invalide", async () => {
        expect(await store.claimInvite("n-existe-pas", "hash-appareil", T0)).toEqual({ status: "invalide" });
      });

      test("findDevice renvoie l'appareil et son profil, puis null une fois retiré", async () => {
        const p = await store.createProfile("Camille", "member");
        await store.createInvite(p.id, "Téléphone", "hash-invite", plusTard(60));
        const claim = await store.claimInvite("hash-invite", "hash-appareil", T0);
        if (claim.status !== "ok") throw new Error("invitation non réclamée");

        const trouve = await store.findDevice("hash-appareil");
        expect(trouve?.profile).toEqual({ id: p.id, name: "Camille", role: "member" });
        expect(await store.findDevice("autre")).toBeNull();

        await store.touchDevice(claim.device.id, plusTard(5));
        expect((await store.findDevice("hash-appareil"))?.device.lastSeenAt).toBe(plusTard(5));

        await store.revokeDevice(claim.device.id, plusTard(10));
        expect(await store.findDevice("hash-appareil")).toBeNull();
      });

      test("listDevices donne le nom du profil et la date de retrait", async () => {
        const p = await store.createProfile("Camille", "member");
        await store.createInvite(p.id, "Téléphone", "hash-invite", plusTard(60));
        const claim = await store.claimInvite("hash-invite", "hash-appareil", T0);
        if (claim.status !== "ok") throw new Error("invitation non réclamée");
        await store.revokeDevice(claim.device.id, plusTard(10));
        const liste = await store.listDevices();
        expect(liste).toHaveLength(1);
        expect(liste[0]).toMatchObject({ profileName: "Camille", label: "Téléphone", revokedAt: plusTard(10) });
      });
    });

    describe("envois et entretien", () => {
      test("countSubmissions ne compte que les envois après la date, pour la bonne adresse", async () => {
        await store.logSubmission("ip1", plusTard(-90));
        await store.logSubmission("ip1", plusTard(-10));
        await store.logSubmission("ip2", plusTard(-5));
        expect(await store.countSubmissions("ip1", plusTard(-60))).toBe(1);
        expect(await store.countSubmissions("ip1", plusTard(-120))).toBe(2);
        expect(await store.countSubmissions("ip3", plusTard(-120))).toBe(0);
      });

      test("ping ne lève pas d'erreur", async () => {
        await expect(store.ping()).resolves.toBeUndefined();
      });
    });
  });
}

import { beforeEach, describe, expect, test } from "vitest";
import { VISITOR, type Viewer } from "./auth";
import { uneRecette } from "./recipe/fixtures";
import { MAX_PAYLOAD_BYTES } from "./recipe/types";
import {
  approveRecipe,
  canEdit,
  canView,
  exportAll,
  listPending,
  listPublished,
  removeRecipe,
  submitRecipe,
} from "./service";
import { MemoryStore } from "./store/memory";

const T = Date.parse("2026-10-18T10:00:00.000Z");
const MIN = 60_000;

let store: MemoryStore;
let admin: Viewer;
let camille: Viewer;
let lea: Viewer;

const viewerDe = (p: { id: string; name: string; role: "admin" | "member" }): Viewer => ({
  role: p.role,
  profileId: p.id,
  name: p.name,
  deviceId: "d-" + p.id,
});
const ctx = (ipHash = "ip1", now = T) => ({ ipHash, now: () => now });

beforeEach(async () => {
  store = new MemoryStore();
  admin = viewerDe(await store.createProfile("Mathieu", "admin"));
  camille = viewerDe(await store.createProfile("Camille", "member"));
  lea = viewerDe(await store.createProfile("Léa", "member"));
});

function valeur<R>(r: { ok: true; value: R } | { ok: false; code: string }): R {
  if (!r.ok) throw new Error("attendu ok, reçu " + r.code);
  return r.value;
}

describe("submitRecipe : nouvelle recette", () => {
  test("visiteur : en attente, sans auteur", async () => {
    const row = valeur(await submitRecipe(store, VISITOR, uneRecette(), ctx()));
    expect(row.status).toBe("pending");
    expect(row.authorId).toBeNull();
  });

  test("membre : publiée tout de suite, avec son nom d'auteur", async () => {
    const row = valeur(await submitRecipe(store, camille, uneRecette(), ctx()));
    expect(row.status).toBe("published");
    expect(row.authorId).toBe(camille.profileId);
  });

  test("admin : publiée", async () => {
    expect(valeur(await submitRecipe(store, admin, uneRecette(), ctx())).status).toBe("published");
  });

  test("visiteur : le 6e envoi dans l'heure est refusé, le 6e après 61 minutes passe", async () => {
    for (let i = 0; i < 5; i++) valeur(await submitRecipe(store, VISITOR, uneRecette(), ctx("ip1", T + i * MIN)));
    expect(await submitRecipe(store, VISITOR, uneRecette(), ctx("ip1", T + 6 * MIN))).toEqual({
      ok: false,
      code: "rate_limited",
    });
    expect((await submitRecipe(store, VISITOR, uneRecette(), ctx("ip1", T + 65 * MIN))).ok).toBe(true);
  });

  test("la limite est par adresse : une autre adresse n'est pas bloquée", async () => {
    for (let i = 0; i < 5; i++) valeur(await submitRecipe(store, VISITOR, uneRecette(), ctx("ip1")));
    expect((await submitRecipe(store, VISITOR, uneRecette(), ctx("ip2"))).ok).toBe(true);
  });

  test("les membres ne sont pas limités", async () => {
    for (let i = 0; i < 8; i++) valeur(await submitRecipe(store, camille, uneRecette(), ctx()));
  });

  test("recette trop grosse : refusée, et rien n'est écrit (ni recette ni envoi compté)", async () => {
    const enorme = uneRecette({ notes: "x".repeat(MAX_PAYLOAD_BYTES + 1) });
    expect(await submitRecipe(store, VISITOR, enorme, ctx())).toEqual({ ok: false, code: "too_large" });
    expect(await store.listRecipes()).toHaveLength(0);
    expect(await store.countSubmissions("ip1", new Date(T - 3600_000).toISOString())).toBe(0);
  });
});

describe("submitRecipe : mise à jour (id présent)", () => {
  test("le membre modifie sa propre recette, elle reste publiée", async () => {
    const row = valeur(await submitRecipe(store, camille, uneRecette(), ctx()));
    const maj = valeur(await submitRecipe(store, camille, uneRecette({ id: row.id, titre: "Nouveau titre" }), ctx()));
    expect(maj.id).toBe(row.id);
    expect(maj.recipe.titre).toBe("Nouveau titre");
    expect(maj.status).toBe("published");
    expect(await store.listRecipes()).toHaveLength(1);
  });

  test("le membre ne modifie pas la recette d'un autre", async () => {
    const row = valeur(await submitRecipe(store, camille, uneRecette(), ctx()));
    expect(await submitRecipe(store, lea, uneRecette({ id: row.id }), ctx())).toEqual({ ok: false, code: "forbidden" });
  });

  test("l'admin modifie tout", async () => {
    const row = valeur(await submitRecipe(store, camille, uneRecette(), ctx()));
    expect((await submitRecipe(store, admin, uneRecette({ id: row.id, titre: "Corrigé" }), ctx())).ok).toBe(true);
  });

  test("un visiteur ne modifie rien", async () => {
    const row = valeur(await submitRecipe(store, camille, uneRecette(), ctx()));
    expect(await submitRecipe(store, VISITOR, uneRecette({ id: row.id }), ctx())).toEqual({ ok: false, code: "forbidden" });
  });

  test("id inconnu : not_found", async () => {
    expect(
      await submitRecipe(store, camille, uneRecette({ id: "00000000-0000-4000-8000-000000000000" }), ctx()),
    ).toEqual({ ok: false, code: "not_found" });
  });
});

describe("validation, suppression, listes", () => {
  test("approveRecipe : admin seulement, passe en publiée", async () => {
    const row = valeur(await submitRecipe(store, VISITOR, uneRecette(), ctx()));
    expect(await approveRecipe(store, camille, row.id)).toEqual({ ok: false, code: "forbidden" });
    expect(await approveRecipe(store, VISITOR, row.id)).toEqual({ ok: false, code: "forbidden" });
    expect(valeur(await approveRecipe(store, admin, row.id)).status).toBe("published");
    expect(await approveRecipe(store, admin, "00000000-0000-4000-8000-000000000000")).toEqual({
      ok: false,
      code: "not_found",
    });
  });

  test("removeRecipe : le membre supprime la sienne, pas celle d'un autre ; l'admin supprime tout", async () => {
    const a = valeur(await submitRecipe(store, camille, uneRecette({ titre: "A" }), ctx()));
    const b = valeur(await submitRecipe(store, camille, uneRecette({ titre: "B" }), ctx()));
    expect(await removeRecipe(store, lea, a.id)).toEqual({ ok: false, code: "forbidden" });
    expect(await removeRecipe(store, VISITOR, a.id)).toEqual({ ok: false, code: "forbidden" });
    expect((await removeRecipe(store, camille, a.id)).ok).toBe(true);
    expect((await removeRecipe(store, admin, b.id)).ok).toBe(true);
    expect(await removeRecipe(store, admin, b.id)).toEqual({ ok: false, code: "not_found" });
  });

  test("listPublished exclut les recettes en attente et filtre", async () => {
    valeur(await submitRecipe(store, camille, uneRecette({ titre: "Publiée" }), ctx()));
    valeur(await submitRecipe(store, VISITOR, uneRecette({ titre: "En attente" }), ctx()));
    expect((await listPublished(store)).map((r) => r.recipe.titre)).toEqual(["Publiée"]);
    expect(await listPublished(store, "attente")).toEqual([]);
    expect(await listPublished(store, "publiee", "salade")).toHaveLength(1);
  });

  test("listPending et exportAll : admin seulement", async () => {
    valeur(await submitRecipe(store, camille, uneRecette({ titre: "Publiée" }), ctx()));
    valeur(await submitRecipe(store, VISITOR, uneRecette({ titre: "En attente" }), ctx()));
    expect(await listPending(store, camille)).toEqual({ ok: false, code: "forbidden" });
    expect(await exportAll(store, VISITOR)).toEqual({ ok: false, code: "forbidden" });
    expect(valeur(await listPending(store, admin)).map((r) => r.recipe.titre)).toEqual(["En attente"]);
    expect(valeur(await exportAll(store, admin))).toHaveLength(2);
  });
});

describe("canView et canEdit", () => {
  test("une recette publiée est visible par tous, une en attente par l'admin et son auteur seulement", async () => {
    const publiee = valeur(await submitRecipe(store, camille, uneRecette(), ctx()));
    const attente = valeur(await submitRecipe(store, VISITOR, uneRecette(), ctx()));
    expect(canView(VISITOR, publiee)).toBe(true);
    expect(canView(VISITOR, attente)).toBe(false);
    expect(canView(lea, attente)).toBe(false);
    expect(canView(admin, attente)).toBe(true);
    const attenteCamille = await store.insertRecipe({ status: "pending", authorId: camille.profileId, recipe: uneRecette() });
    expect(canView(camille, attenteCamille)).toBe(true);
  });

  test("on modifie sa recette ; l'admin modifie tout ; un visiteur rien", async () => {
    const row = valeur(await submitRecipe(store, camille, uneRecette(), ctx()));
    expect(canEdit(camille, row)).toBe(true);
    expect(canEdit(lea, row)).toBe(false);
    expect(canEdit(admin, row)).toBe(true);
    expect(canEdit(VISITOR, row)).toBe(false);
  });
});

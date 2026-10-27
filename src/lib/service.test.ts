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
  listerGroupe,
  racineDe,
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

describe("image conservée à la mise à jour", () => {
  test("une mise à jour qui ne mentionne pas l'image (Claude l'a oubliée) garde l'image existante", async () => {
    const row = valeur(await submitRecipe(store, camille, uneRecette({ image: "https://exemple.test/a.jpg" }), ctx()));
    const maj = valeur(await submitRecipe(store, camille, uneRecette({ id: row.id, titre: "Autre titre" }), ctx()));
    expect(maj.recipe.titre).toBe("Autre titre");
    expect(maj.recipe.image).toBe("https://exemple.test/a.jpg");
  });

  test("une mise à jour qui donne une nouvelle image la remplace", async () => {
    const row = valeur(await submitRecipe(store, camille, uneRecette({ image: "https://exemple.test/a.jpg" }), ctx()));
    const maj = valeur(
      await submitRecipe(store, camille, uneRecette({ id: row.id, image: "https://exemple.test/b.jpg" }), ctx()),
    );
    expect(maj.recipe.image).toBe("https://exemple.test/b.jpg");
  });
});

describe("variantes", () => {
  const nouvelle = (v: Viewer, partiel: Parameters<typeof uneRecette>[0] = {}) =>
    submitRecipe(store, v, uneRecette(partiel), ctx());

  test("nouvelle recette avec variante_de (slug) : rattachée à la recette visée", async () => {
    const a = valeur(await nouvelle(camille, { titre: "Lasagnes" }));
    const b = valeur(await nouvelle(lea, { titre: "Lasagnes végé", variante_de: a.slug, nom_variante: "Végétarienne" }));
    expect(b.varianteDe).toBe(a.id);
    expect(b.recipe.nom_variante).toBe("Végétarienne");
    expect("variante_de" in b.recipe).toBe(false);
  });

  test("variante d'une variante : rattachée à la référence (un seul niveau)", async () => {
    const a = valeur(await nouvelle(camille, { titre: "Lasagnes" }));
    const b = valeur(await nouvelle(camille, { titre: "Lasagnes végé", variante_de: a.id }));
    const c = valeur(await nouvelle(camille, { titre: "Lasagnes express", variante_de: b.slug }));
    expect(c.varianteDe).toBe(a.id);
  });

  test("variante_de inconnue : variante_introuvable, rien n'est enregistré", async () => {
    const r = await nouvelle(camille, { variante_de: "inconnue" });
    expect(r).toEqual({ ok: false, code: "variante_introuvable" });
    expect(await store.listRecipes()).toHaveLength(0);
  });

  test("variante_de qui vise une recette en attente invisible pour un visiteur : variante_introuvable", async () => {
    const cachee = valeur(await nouvelle(VISITOR, { titre: "Cachée" }));
    expect(await submitRecipe(store, VISITOR, uneRecette({ variante_de: cachee.slug }), ctx("ip2"))).toEqual({
      ok: false,
      code: "variante_introuvable",
    });
  });

  test("un visiteur envoie une variante d'une recette publiée : en attente, mais rattachée", async () => {
    const a = valeur(await nouvelle(camille, { titre: "Lasagnes" }));
    const b = valeur(await nouvelle(VISITOR, { variante_de: a.slug }));
    expect(b.status).toBe("pending");
    expect(b.varianteDe).toBe(a.id);
  });

  test("modification sans variante_de ni nom_variante : rattachement et nom conservés", async () => {
    const a = valeur(await nouvelle(camille, { titre: "Lasagnes" }));
    const b = valeur(await nouvelle(camille, { variante_de: a.slug, nom_variante: "Végétarienne" }));
    const maj = valeur(await submitRecipe(store, lea, uneRecette({ id: b.id, titre: "Corrigée" }), ctx()));
    expect(maj.varianteDe).toBe(a.id);
    expect(maj.recipe.nom_variante).toBe("Végétarienne");
    expect(maj.recipe.titre).toBe("Corrigée");
  });

  test("modification avec variante_de: null : la recette est détachée", async () => {
    const a = valeur(await nouvelle(camille, { titre: "Lasagnes" }));
    const b = valeur(await nouvelle(camille, { variante_de: a.slug }));
    const maj = valeur(await submitRecipe(store, camille, uneRecette({ id: b.id, variante_de: null }), ctx()));
    expect(maj.varianteDe).toBeNull();
  });

  test("modification avec nom_variante: null : le nom est retiré", async () => {
    const a = valeur(await nouvelle(camille, { titre: "Lasagnes" }));
    const b = valeur(await nouvelle(camille, { variante_de: a.slug, nom_variante: "Végé" }));
    const maj = valeur(await submitRecipe(store, camille, uneRecette({ id: b.id, nom_variante: null }), ctx()));
    expect("nom_variante" in maj.recipe).toBe(false);
  });

  test("rattacher une référence à un autre plat : ses variantes la suivent", async () => {
    const a = valeur(await nouvelle(camille, { titre: "Lasagnes A" }));
    const b = valeur(await nouvelle(camille, { variante_de: a.slug }));
    const c = valeur(await nouvelle(camille, { titre: "Lasagnes C" }));
    const maj = valeur(await submitRecipe(store, camille, uneRecette({ id: a.id, variante_de: c.slug }), ctx()));
    expect(maj.varianteDe).toBe(c.id);
    expect((await store.getRecipe(b.id))?.varianteDe).toBe(c.id);
  });

  test("variante_de qui vise la recette elle-même ou son propre plat : rien ne change, pas d'erreur", async () => {
    const a = valeur(await nouvelle(camille, { titre: "Lasagnes" }));
    const b = valeur(await nouvelle(camille, { variante_de: a.slug }));
    expect(valeur(await submitRecipe(store, camille, uneRecette({ id: a.id, variante_de: a.slug }), ctx())).varianteDe).toBeNull();
    expect(valeur(await submitRecipe(store, camille, uneRecette({ id: a.id, variante_de: b.slug }), ctx())).varianteDe).toBeNull();
    expect(valeur(await submitRecipe(store, camille, uneRecette({ id: b.id, variante_de: b.slug }), ctx())).varianteDe).toBe(a.id);
    expect((await store.getRecipe(b.id))?.varianteDe).toBe(a.id);
  });

  test("supprimer la référence : la plus ancienne variante prend sa place, les autres la suivent", async () => {
    const a = valeur(await nouvelle(camille, { titre: "Lasagnes" }));
    const b = valeur(await nouvelle(camille, { variante_de: a.slug }));
    const c = valeur(await nouvelle(camille, { variante_de: a.slug }));
    valeur(await removeRecipe(store, camille, a.id));
    expect((await store.getRecipe(b.id))?.varianteDe).toBeNull();
    expect((await store.getRecipe(c.id))?.varianteDe).toBe(b.id);
  });

  test("supprimer la référence dont la plus ancienne variante est en attente : elle devient la référence", async () => {
    const a = valeur(await nouvelle(camille, { titre: "Lasagnes" }));
    const b = valeur(await nouvelle(VISITOR, { variante_de: a.slug }));
    const c = valeur(await nouvelle(camille, { variante_de: a.slug }));
    valeur(await removeRecipe(store, admin, a.id));
    expect((await store.getRecipe(b.id))?.varianteDe).toBeNull();
    expect((await store.getRecipe(c.id))?.varianteDe).toBe(b.id);
  });

  test("listerGroupe : référence, puis variantes de la plus ancienne à la plus récente", async () => {
    const a = valeur(await nouvelle(camille, { titre: "Lasagnes" }));
    const b = valeur(await nouvelle(camille, { variante_de: a.slug }));
    const c = valeur(await nouvelle(camille, { variante_de: a.slug }));
    await nouvelle(camille, { titre: "Autre plat" });
    const groupe = await listerGroupe(store, VISITOR, c);
    expect(groupe.map((r) => r.id)).toEqual([a.id, b.id, c.id]);
    expect(racineDe(c)).toBe(a.id);
    expect(racineDe(a)).toBe(a.id);
  });

  test("listerGroupe : une variante en attente n'apparaît que si c'est la recette demandée", async () => {
    const a = valeur(await nouvelle(camille, { titre: "Lasagnes" }));
    const b = valeur(await nouvelle(VISITOR, { variante_de: a.slug }));
    expect((await listerGroupe(store, VISITOR, a)).map((r) => r.id)).toEqual([a.id]);
    expect((await listerGroupe(store, admin, b)).map((r) => r.id)).toEqual([a.id, b.id]);
  });

  test("listerGroupe : une recette seule renvoie une liste d'un élément", async () => {
    const a = valeur(await nouvelle(camille));
    expect(await listerGroupe(store, VISITOR, a)).toHaveLength(1);
  });
});

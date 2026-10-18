// @vitest-environment node
import { describe, expect, test } from "vitest";
import { createAccessToken, VISITOR } from "./auth";
import { cookieValue, refusJeton, viewerFromRequest } from "./http";
import { MemoryStore } from "./store/memory";

describe("cookieValue", () => {
  test("lit une valeur parmi plusieurs cookies et la décode", () => {
    expect(cookieValue("a=1; nc_device=abc%20def; b=2", "nc_device")).toBe("abc def");
    expect(cookieValue("a=1", "nc_device")).toBeUndefined();
    expect(cookieValue(null, "nc_device")).toBeUndefined();
  });

  test("valeur mal encodée : ne lève pas d'erreur, renvoie le texte tel quel", () => {
    expect(cookieValue("nc_device=%E0%A4%A", "nc_device")).toBe("%E0%A4%A");
  });
});

describe("viewerFromRequest", () => {
  test("cookie d'appareil abîmé : simple visiteur, jamais une erreur", async () => {
    const req = new Request("https://x.test/", { headers: { cookie: "nc_device=%E0%A4%A" } });
    expect((await viewerFromRequest(req, new MemoryStore())).role).toBe("visitor");
  });
});

describe("viewerFromRequest : jeton d'accès (en-tête Authorization)", () => {
  async function avecJeton() {
    const store = new MemoryStore();
    const profil = await store.createProfile("Camille", "member");
    const { token } = await createAccessToken(store, profil.id, "Claude");
    return { store, profil, token };
  }
  const requete = (headers: Record<string, string>) => new Request("https://x.test/", { headers });

  test("« Authorization: Bearer <jeton> » identifie le membre", async () => {
    const { store, profil, token } = await avecJeton();
    expect(await viewerFromRequest(requete({ authorization: `Bearer ${token}` }), store)).toMatchObject({
      role: "member",
      profileId: profil.id,
      jeton: true,
    });
  });

  test("le mot « Bearer » est reconnu sans tenir compte des majuscules, les espaces en trop sont ignorés", async () => {
    const { store, token } = await avecJeton();
    const v = await viewerFromRequest(requete({ authorization: `  bearer   ${token}  ` }), store);
    expect(v.role).toBe("member");
  });

  test("jeton inconnu ou retiré : visiteur, marqué « jetonInvalide » pour répondre 401", async () => {
    const { store } = await avecJeton();
    const v = await viewerFromRequest(requete({ authorization: "Bearer nc_faux" }), store);
    expect(v).toMatchObject({ role: "visitor", jetonInvalide: true });
  });

  test("un en-tête Authorization d'un autre type (Basic…) est ignoré", async () => {
    const { store } = await avecJeton();
    const v = await viewerFromRequest(requete({ authorization: "Basic abc" }), store);
    expect(v).toEqual(VISITOR);
  });

  test("le jeton l'emporte sur un cookie d'appareil", async () => {
    const { store, profil, token } = await avecJeton();
    const v = await viewerFromRequest(requete({ authorization: `Bearer ${token}`, cookie: "nc_device=zzz" }), store);
    expect(v.profileId).toBe(profil.id);
  });
});

describe("refusJeton", () => {
  test("renvoie une réponse 401 explicite si le jeton présenté est invalide, sinon rien", async () => {
    const res = refusJeton({ ...VISITOR, jetonInvalide: true });
    expect(res?.status).toBe(401);
    expect((await res!.json()).erreur).toMatch(/jeton/i);
    expect(refusJeton(VISITOR)).toBeNull();
  });
});

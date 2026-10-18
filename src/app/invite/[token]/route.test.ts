// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createInviteLink, DEVICE_COOKIE, getViewer } from "@/lib/auth";
import { MemoryStore } from "@/lib/store/memory";
import { setStoreForTests } from "@/lib/store";
import { GET, POST } from "./route";

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
  setStoreForTests(store);
});
afterEach(() => setStoreForTests(null));

const ctx = (token: string) => ({ params: Promise.resolve({ token }) });
// GET ne lit ni l'adresse ni le jeton : ouvrir le lien ne doit rien consommer
const ouvrir = (_token: string) => GET();
const confirmer = (token: string) =>
  POST(new Request(`https://x.test/invite/${token}`, { method: "POST" }), ctx(token));

async function nouveauLien() {
  const p = await store.createProfile("Camille", "member");
  const lien = await createInviteLink(store, p.id, "Téléphone", "https://x.test");
  return lien.split("/invite/")[1];
}

describe("GET /invite/[token] : page de confirmation (les aperçus de messagerie ne consomment pas le lien)", () => {
  test("affiche un bouton, sans cookie, et l'invitation reste utilisable", async () => {
    const token = await nouveauLien();
    const res = await ouvrir(token);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(res.headers.get("x-robots-tag")).toContain("noindex");
    const html = await res.text();
    expect(html).toContain('method="post"');
    expect(html).toContain("Reconnaître cet appareil");
    // une deuxième ouverture (robot, deuxième aperçu) fonctionne encore, et l'invitation n'est pas brûlée
    expect((await ouvrir(token)).status).toBe(200);
    expect((await confirmer(token)).status).toBe(303);
  });

  test("le jeton n'est jamais recopié tel quel dans la page", async () => {
    const html = await (await ouvrir('"><script>alert(1)</script>')).text();
    expect(html).not.toContain("<script>alert(1)");
  });
});

describe("POST /invite/[token] : reconnaît l'appareil", () => {
  test("invitation valide : cookie d'appareil de longue durée, retour à l'accueil, appareil reconnu", async () => {
    const token = await nouveauLien();
    const res = await confirmer(token);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://x.test/");
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${DEVICE_COOKIE}=`);
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie).toContain("Max-Age=34560000");
    const valeur = cookie.match(new RegExp(`${DEVICE_COOKIE}=([^;]+)`))![1];
    expect(await getViewer(store, valeur)).toMatchObject({ role: "member", name: "Camille" });
  });

  test("invitation déjà utilisée : 410 avec un message clair, sans cookie", async () => {
    const token = await nouveauLien();
    await confirmer(token);
    const res = await confirmer(token);
    expect(res.status).toBe(410);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(await res.text()).toContain("Cette invitation a déjà été utilisée.");
  });

  test("jeton inconnu : 410", async () => {
    const res = await confirmer("inconnu");
    expect(res.status).toBe(410);
    expect(await res.text()).toContain("Invitation introuvable.");
  });
});

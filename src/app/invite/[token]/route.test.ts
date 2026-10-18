// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createInviteLink, DEVICE_COOKIE } from "@/lib/auth";
import { MemoryStore } from "@/lib/store/memory";
import { setStoreForTests } from "@/lib/store";
import { GET } from "./route";

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
  setStoreForTests(store);
});
afterEach(() => setStoreForTests(null));

const appeler = (token: string) =>
  GET(new Request(`https://x.test/invite/${token}`), { params: Promise.resolve({ token }) });

describe("GET /invite/[token]", () => {
  test("invitation valide : cookie d'appareil de longue durée et retour à l'accueil", async () => {
    const p = await store.createProfile("Camille", "member");
    const lien = await createInviteLink(store, p.id, "Téléphone", "https://x.test");
    const res = await appeler(lien.split("/invite/")[1]);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://x.test/");
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${DEVICE_COOKIE}=`);
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie).toContain("Max-Age=34560000");
  });

  test("invitation déjà utilisée : 410 avec un message clair, sans cookie", async () => {
    const p = await store.createProfile("Camille", "member");
    const token = (await createInviteLink(store, p.id, "Téléphone", "https://x.test")).split("/invite/")[1];
    await appeler(token);
    const res = await appeler(token);
    expect(res.status).toBe(410);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(await res.text()).toContain("Cette invitation a déjà été utilisée.");
  });

  test("jeton inconnu : 410", async () => {
    const res = await appeler("inconnu");
    expect(res.status).toBe(410);
    expect(await res.text()).toContain("Invitation introuvable.");
  });
});

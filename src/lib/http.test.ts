// @vitest-environment node
import { describe, expect, test } from "vitest";
import { cookieValue, viewerFromRequest } from "./http";
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

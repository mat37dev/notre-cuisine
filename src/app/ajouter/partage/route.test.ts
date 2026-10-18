// @vitest-environment node
import { describe, expect, test } from "vitest";
import { POST } from "./route";

function formulaire(champs: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(champs)) fd.set(k, v);
  return new Request("https://x.test/ajouter/partage", { method: "POST", body: fd });
}

describe("POST /ajouter/partage (cible de partage Android)", () => {
  test("renvoie une page HTML qui garde le texte partagé", async () => {
    const res = await POST(formulaire({ text: "Ma recette", title: "Un titre" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(res.headers.get("cache-control")).toBe("no-store");
    const html = await res.text();
    expect(html).toContain('"Ma recette"');
    expect(html).not.toContain("Un titre");
  });

  test("sans texte, se rabat sur l'adresse puis le titre", async () => {
    expect(await (await POST(formulaire({ url: "https://exemple.test/r" }))).text()).toContain("https://exemple.test/r");
    expect(await (await POST(formulaire({ title: "Seulement un titre" }))).text()).toContain("Seulement un titre");
  });

  test("corps qui n'est pas un formulaire : page avec texte vide, pas d'erreur 500", async () => {
    const res = await POST(new Request("https://x.test/ajouter/partage", { method: "POST", body: "n'importe quoi" }));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('const texte = "";');
  });
});

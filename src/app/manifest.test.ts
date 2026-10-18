import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import manifest from "./manifest";

describe("manifeste de l'appli", () => {
  const m = manifest();

  test("installable : nom, affichage plein écran, page de départ", () => {
    expect(m.name).toBe("Notre cuisine");
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    expect(m.lang).toBe("fr");
  });

  test("icônes 192 et 512 px, dont une « maskable », et les fichiers existent", () => {
    const icones = m.icons ?? [];
    expect(icones.map((i) => i.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect(icones.some((i) => i.purpose === "maskable")).toBe(true);
    for (const i of icones) expect(existsSync(join(process.cwd(), "public", i.src)), i.src).toBe(true);
  });

  test("cible de partage Android : POST multipart vers /ajouter/partage", () => {
    expect(m.share_target).toEqual({
      action: "/ajouter/partage",
      method: "POST",
      enctype: "multipart/form-data",
      params: { title: "title", text: "text", url: "url" },
    });
  });
});

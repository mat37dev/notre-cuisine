import { describe, expect, test } from "vitest";
import { makeSlug, slugify } from "./slug";

describe("slugify", () => {
  test("retire accents, majuscules et ponctuation", () => {
    expect(slugify("Œufs à la neige !")).toBe("oeufs-a-la-neige");
  });
});

describe("makeSlug", () => {
  test("titre avec accents", () => {
    expect(makeSlug("Salade Italienne à la Burrata", new Set())).toBe("salade-italienne-a-la-burrata");
  });

  test("collision : ajoute -2 puis -3", () => {
    expect(makeSlug("Salade", new Set(["salade"]))).toBe("salade-2");
    expect(makeSlug("Salade", new Set(["salade", "salade-2"]))).toBe("salade-3");
  });

  test("titre sans lettre : « recette »", () => {
    expect(makeSlug("!!!", new Set())).toBe("recette");
  });
});

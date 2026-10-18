import { describe, expect, test } from "vitest";
import { EMOJIS_CATEGORIES, LIBELLES_CATEGORIES, TEINTES_CATEGORIES } from "./labels";
import { CATEGORIES } from "./types";

describe("catégories", () => {
  test("chaque catégorie a un libellé, un emoji et une teinte", () => {
    for (const c of CATEGORIES) {
      expect(LIBELLES_CATEGORIES[c], c).toBeTruthy();
      expect(EMOJIS_CATEGORIES[c], c).toBeTruthy();
      expect(TEINTES_CATEGORIES[c], c).toMatch(/^\d{1,3}$/);
    }
  });

  test("aucun libellé en trop", () => {
    expect(Object.keys(LIBELLES_CATEGORIES).sort()).toEqual([...CATEGORIES].sort());
    expect(Object.keys(EMOJIS_CATEGORIES).sort()).toEqual([...CATEGORIES].sort());
    expect(Object.keys(TEINTES_CATEGORIES).sort()).toEqual([...CATEGORIES].sort());
  });
});

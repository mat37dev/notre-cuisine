import { describe, expect, test } from "vitest";
import { parseRecipeBlock } from "./parse";

const base = {
  titre: "Salade burrata",
  portions: 4,
  categorie: "salade",
  ingredients: [
    { id: "burrata", nom: "burrata", quantite: 4, unite: "piece" },
    { id: "tomates", nom: "tomates cerises", quantite: 400, unite: "g" },
  ],
  etapes: [{ texte: "Couper {{tomates}} de tomates." }],
};

const fence = (o: unknown) => "```json\n" + JSON.stringify(o, null, 2) + "\n```";

function ok(text: string) {
  const r = parseRecipeBlock(text);
  if (!r.ok) throw new Error("attendu ok, reçu : " + r.errors.join(" | "));
  return r;
}

describe("extraction", () => {
  test("extrait un bloc entouré de phrases", () => {
    const r = ok("Voilà !\n" + fence(base) + "\nBon appétit");
    expect(r.recipe.titre).toBe("Salade burrata");
    expect(r.recipe.ingredients).toHaveLength(2);
  });

  test("choisit le premier bloc qui est une recette", () => {
    const r = ok(fence({ truc: 1 }) + "\n" + fence(base));
    expect(r.recipe.titre).toBe("Salade burrata");
  });

  test("trouve un objet sans bloc de code, au milieu de texte avec des accolades", () => {
    const r = ok("Voilà {ça} : " + JSON.stringify(base) + " fin.");
    expect(r.recipe.titre).toBe("Salade burrata");
  });

  test("accepte clés avec accents ou majuscules, nombres français, guillemets typographiques et virgules en trop", () => {
    const texte = `Voici :
\`\`\`json
{
  “Titre”: “Pâte à cookies”,
  “catégorie”: “dessert”,
  “portions”: 3,
  “ingredients”: [
    { “id”: “farine”, “nom”: “farine”, “quantité”: “1,5”, “unité”: “kg”, },
    { “id”: “lait”, “nom”: “lait”, “quantite”: 100, “unite”: “grams” },
  ],
  “étapes”: [ { “texte”: “Mélanger.” }, ],
}
\`\`\``;
    const r = ok(texte);
    expect(r.recipe.titre).toBe("Pâte à cookies");
    expect(r.recipe.categorie).toBe("dessert");
    expect(r.recipe.ingredients[0]).toMatchObject({ quantite: 1.5, unite: "kg" });
    expect(r.recipe.ingredients[1]).toMatchObject({ quantite: 100, unite: "g" });
  });
});

describe("unités", () => {
  test.each([
    ["grams", "g"],
    ["gramme", "g"],
    ["kilogrammes", "kg"],
    ["milliliters", "ml"],
    ["litre", "l"],
    ["cuillères à soupe", "cas"],
    ["c. à soupe", "cas"],
    ["tablespoons", "cas"],
    ["cuillère à café", "cac"],
    ["teaspoon", "cac"],
    ["pincée", "pincee"],
    ["pinch", "pincee"],
    ["pièce", "piece"],
    ["", ""],
  ])("« %s » devient %s", (entree, attendu) => {
    const r = ok(
      fence({ ...base, ingredients: [{ id: "x", nom: "x", quantite: 1, unite: entree }] }),
    );
    expect(r.recipe.ingredients[0].unite).toBe(attendu);
  });

  test("une unité inconnue est gardée sans unité, avec un avertissement", () => {
    const r = ok(
      fence({ ...base, ingredients: [{ id: "x", nom: "x", quantite: 1, unite: "poignée" }] }),
    );
    expect(r.recipe.ingredients[0].unite).toBe("");
    expect(r.warnings.join(" ")).toContain("poignée");
  });
});

describe("valeurs par défaut et conservation", () => {
  test("portions manquantes : 4 et un avertissement", () => {
    const { portions: _p, ...sans } = base;
    const r = ok(fence(sans));
    expect(r.recipe.portions).toBe(4);
    expect(r.warnings.join(" ")).toContain("portions");
  });

  test("portions à 0 : 4 et un avertissement", () => {
    const r = ok(fence({ ...base, portions: 0 }));
    expect(r.recipe.portions).toBe(4);
    expect(r.warnings.join(" ")).toContain("portions");
  });

  test("catégorie inconnue ou absente : autre et un avertissement", () => {
    const r1 = ok(fence({ ...base, categorie: "brunch" }));
    expect(r1.recipe.categorie).toBe("autre");
    expect(r1.warnings.join(" ")).toContain("catégorie");
    const { categorie: _c, ...sans } = base;
    expect(ok(fence(sans)).recipe.categorie).toBe("autre");
  });

  test("identifiants d'ingrédient en double : tomates puis tomates-2, avec un avertissement", () => {
    const r = ok(
      fence({
        ...base,
        ingredients: [
          { id: "tomates", nom: "tomates cerises", quantite: 200, unite: "g" },
          { id: "tomates", nom: "tomates coeur de boeuf", quantite: 200, unite: "g" },
        ],
      }),
    );
    expect(r.recipe.ingredients.map((i) => i.id)).toEqual(["tomates", "tomates-2"]);
    expect(r.warnings.join(" ")).toContain("tomates");
  });

  test("identifiant mal écrit : normalisé aussi dans les références des étapes", () => {
    const r = ok(
      fence({
        ...base,
        ingredients: [{ id: "Tomates cerises", nom: "tomates", quantite: 1, unite: "g" }],
        etapes: [{ texte: "Couper {{Tomates cerises}}." }],
      }),
    );
    expect(r.recipe.ingredients[0].id).toBe("tomates-cerises");
    expect(r.recipe.etapes[0].texte).toBe("Couper {{tomates-cerises}}.");
  });

  test("identifiant absent : déduit du nom", () => {
    const r = ok(
      fence({ ...base, ingredients: [{ nom: "Pignons de pin", quantite: 40, unite: "g" }] }),
    );
    expect(r.recipe.ingredients[0].id).toBe("pignons-de-pin");
  });

  test("quantité absente, texte non numérique ou négative : null (« au goût »)", () => {
    const r = ok(
      fence({
        ...base,
        ingredients: [
          { id: "sel", nom: "sel" },
          { id: "poivre", nom: "poivre", quantite: "au goût" },
          { id: "huile", nom: "huile", quantite: -3, unite: "ml" },
        ],
      }),
    );
    expect(r.recipe.ingredients.map((i) => i.quantite)).toEqual([null, null, null]);
  });

  test("garde id, tags, notes, description et chrono (même écrit en texte)", () => {
    const r = ok(
      fence({
        ...base,
        id: "abc-123",
        tags: ["rapide", "froid"],
        notes: "Servir frais.",
        description: "Une salade.",
        etapes: [{ titre: "Dorer", texte: "Dorer les pignons.", chrono_secondes: "150" }],
      }),
    );
    expect(r.recipe.id).toBe("abc-123");
    expect(r.recipe.tags).toEqual(["rapide", "froid"]);
    expect(r.recipe.notes).toBe("Servir frais.");
    expect(r.recipe.description).toBe("Une salade.");
    expect(r.recipe.etapes[0]).toEqual({ titre: "Dorer", texte: "Dorer les pignons.", chrono_secondes: 150 });
  });
});

describe("erreurs en français", () => {
  test("sans JSON", () => {
    expect(parseRecipeBlock("Bonjour, voici une idée de salade !")).toEqual({
      ok: false,
      errors: ["Je ne trouve pas de recette dans ce texte."],
    });
  });

  test("sans titre", () => {
    const { titre: _t, ...sans } = base;
    const r = parseRecipeBlock(fence(sans));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain("Il manque le titre.");
  });

  test("sans ingrédient", () => {
    const r = parseRecipeBlock(fence({ ...base, ingredients: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain("Aucun ingrédient.");
  });

  test("sans étape", () => {
    const r = parseRecipeBlock(fence({ ...base, etapes: [] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toContain("Aucune étape.");
  });

  test("étape sans texte et ingrédient sans nom", () => {
    const r = parseRecipeBlock(
      fence({ ...base, ingredients: [{ id: "a", quantite: 1 }], etapes: [{ titre: "Seule" }] }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toContain("L'ingrédient 1 n'a pas de nom.");
      expect(r.errors).toContain("L'étape 1 n'a pas de texte.");
    }
  });

  test("trop d'ingrédients ou d'étapes", () => {
    const ing = Array.from({ length: 101 }, (_, i) => ({ id: "i" + i, nom: "i" + i, quantite: 1, unite: "g" }));
    const eta = Array.from({ length: 61 }, (_, i) => ({ texte: "étape " + i }));
    const r = parseRecipeBlock(fence({ ...base, ingredients: ing, etapes: eta }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors).toContain("Trop d'ingrédients (maximum 100).");
      expect(r.errors).toContain("Trop d'étapes (maximum 60).");
    }
  });
});

describe("textes hostiles (un visiteur peut envoyer n'importe quoi)", () => {
  test("des dizaines de milliers d'accolades ouvertes : réponse immédiate, pas de calcul interminable", () => {
    const debut = Date.now();
    const r = parseRecipeBlock("{".repeat(60_000));
    expect(Date.now() - debut).toBeLessThan(1500);
    expect(r).toEqual({ ok: false, errors: ["Je ne trouve pas de recette dans ce texte."] });
  });

  test("accolades ouvertes au début puis une vraie recette plus loin : la recette est trouvée", () => {
    const r = parseRecipeBlock("{ { { voilà : " + JSON.stringify(base) + " fin.");
    expect(r.ok).toBe(true);
  });

  test("JSON imbriqué à l'extrême : pas d'exception, simplement pas de recette", () => {
    const profond = "[".repeat(50_000) + "]".repeat(50_000);
    const texte = "```json\n" + profond + "\n```";
    expect(() => parseRecipeBlock(texte)).not.toThrow();
    expect(parseRecipeBlock(texte).ok).toBe(false);
  });
});

describe("image de présentation", () => {
  const adresse = "https://exemple.test/photos/salade.jpg";

  test("une adresse https est gardée, aussi sous les noms photo ou image_url", () => {
    expect(ok(fence({ ...base, image: adresse })).recipe.image).toBe(adresse);
    expect(ok(fence({ ...base, photo: adresse })).recipe.image).toBe(adresse);
    expect(ok(fence({ ...base, image_url: adresse })).recipe.image).toBe(adresse);
  });

  test("sans image : le champ n'existe pas", () => {
    expect("image" in ok(fence(base)).recipe).toBe(false);
  });

  test.each([
    ["http non sécurisé", "http://exemple.test/a.jpg"],
    ["javascript:", "javascript:alert(1)"],
    ["data:", "data:image/png;base64,AAAA"],
    ["pas une adresse", "une belle photo de salade"],
    ["trop longue", "https://exemple.test/" + "a".repeat(600)],
  ])("%s : ignorée avec un avertissement, la recette reste valide", (_nom, valeur) => {
    const r = ok(fence({ ...base, image: valeur }));
    expect("image" in r.recipe).toBe(false);
    expect(r.warnings.join(" ")).toContain("image");
  });
});

describe("variantes", () => {
  test("lit variante_de et nom_variante", () => {
    const r = ok(fence({ ...base, variante_de: "lasagnes", nom_variante: "Végétarienne" }));
    expect(r.recipe.variante_de).toBe("lasagnes");
    expect(r.recipe.nom_variante).toBe("Végétarienne");
  });

  test("comprend les alias anglais variant_of et variant_name", () => {
    const r = ok(fence({ ...base, variant_of: "lasagnes", variant_name: "Végétarienne" }));
    expect(r.recipe.variante_de).toBe("lasagnes");
    expect(r.recipe.nom_variante).toBe("Végétarienne");
  });

  test("null est gardé (détacher, retirer le nom), un champ absent reste absent", () => {
    const nul = ok(fence({ ...base, variante_de: null, nom_variante: null }));
    expect(nul.recipe.variante_de).toBeNull();
    expect(nul.recipe.nom_variante).toBeNull();
    const absent = ok(fence(base));
    expect("variante_de" in absent.recipe).toBe(false);
    expect("nom_variante" in absent.recipe).toBe(false);
  });

  test("nom_variante vide vaut null ; trop long, il est coupé à 40 caractères avec un avertissement", () => {
    expect(ok(fence({ ...base, nom_variante: "  " })).recipe.nom_variante).toBeNull();
    const long = ok(fence({ ...base, nom_variante: "x".repeat(50) }));
    expect(long.recipe.nom_variante).toHaveLength(40);
    expect(long.warnings.join(" ")).toContain("40 caractères");
  });

  test("variante_de vide est ignoré", () => {
    expect("variante_de" in ok(fence({ ...base, variante_de: "  " })).recipe).toBe(false);
  });
});

import { describe, expect, test } from "vitest";
import { buildShareBridgeHtml, SHARE_STORAGE_KEY } from "./share-bridge";

/** Relit la valeur JavaScript que la page écrit dans sessionStorage. */
function valeurEcrite(html: string): string {
  const m = html.match(/const texte = (.*);\n/);
  if (!m) throw new Error("valeur introuvable dans la page");
  return JSON.parse(m[1]) as string;
}

describe("buildShareBridgeHtml", () => {
  test("écrit le texte sous la clé de partage puis redirige vers /ajouter", () => {
    const html = buildShareBridgeHtml("Bonjour");
    expect(SHARE_STORAGE_KEY).toBe("nc_partage");
    expect(html).toContain('sessionStorage.setItem("nc_partage", texte)');
    expect(html).toContain('location.replace("/ajouter?partage=1")');
  });

  test("un texte avec </script> et du HTML ne casse pas la page : une seule balise </script>", () => {
    const html = buildShareBridgeHtml('</script><img src=x onerror="alert(1)"><b>x</b>');
    expect(html.match(/<\/script>/gi)).toHaveLength(1);
    expect(html).not.toContain("<img");
    expect(html).toContain("\\u003c/script>");
  });

  test("le texte est restitué à l'identique (guillemets, retours à la ligne, accents, séparateurs de ligne unicode)", () => {
    const original = 'Voilà "une" recette\nligne 2 \\ œuf \u2028 \u2029 </script>';
    expect(valeurEcrite(buildShareBridgeHtml(original))).toBe(original);
  });

  test("texte vide : page valide avec une chaîne vide", () => {
    expect(valeurEcrite(buildShareBridgeHtml(""))).toBe("");
  });
});

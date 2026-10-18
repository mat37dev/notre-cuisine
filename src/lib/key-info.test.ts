import { describe, expect, test } from "vitest";
import { decrireAdresse, decrireCle } from "./key-info";

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (payload: Record<string, unknown>) => `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.signature-secrete-xyz`;
const URL_PROJET = "https://abcdefghijklmnop.supabase.co";

describe("decrireCle", () => {
  test("absente ou vide", () => {
    expect(decrireCle(undefined, URL_PROJET)).toBe("absente");
    expect(decrireCle("", URL_PROJET)).toBe("absente");
  });

  test("clé secrète moderne : la bonne", () => {
    expect(decrireCle("sb_secret_AbCdEf123", URL_PROJET)).toBe("clé secrète (sb_secret_…)");
  });

  test("clé publique moderne : pas la bonne", () => {
    expect(decrireCle("sb_publishable_AbCdEf123", URL_PROJET)).toContain("clé publique");
    expect(decrireCle("sb_publishable_AbCdEf123", URL_PROJET)).toContain("pas la bonne");
  });

  test("ancienne clé service_role du bon projet : la bonne", () => {
    expect(decrireCle(jwt({ role: "service_role", ref: "abcdefghijklmnop" }), URL_PROJET)).toBe(
      "ancienne clé service_role du projet abcdefghijklmnop",
    );
  });

  test("ancienne clé anon : pas la bonne", () => {
    const d = decrireCle(jwt({ role: "anon", ref: "abcdefghijklmnop" }), URL_PROJET);
    expect(d).toContain("anon");
    expect(d).toContain("pas la bonne");
  });

  test("clé d'un autre projet que celui de SUPABASE_URL", () => {
    const d = decrireCle(jwt({ role: "service_role", ref: "zzzzzzzzzzzzzzzz" }), URL_PROJET);
    expect(d).toContain("zzzzzzzzzzzzzzzz");
    expect(d).toContain("autre projet");
  });

  test("espaces, guillemets ou retour à la ligne collés avec la clé", () => {
    expect(decrireCle('"sb_secret_abc"', URL_PROJET)).toContain("espaces, guillemets");
    expect(decrireCle("sb_secret_abc\n", URL_PROJET)).toContain("espaces, guillemets");
    expect(decrireCle(" sb_secret_abc", URL_PROJET)).toContain("espaces, guillemets");
  });

  test("format inconnu", () => {
    expect(decrireCle("n-importe-quoi", URL_PROJET)).toBe("format inconnu (ni sb_secret_, ni JWT)");
  });

  test("ne recopie jamais le corps de la clé ni la signature", () => {
    for (const cle of ["sb_secret_CorpsSecret999", jwt({ role: "service_role", ref: "abcdefghijklmnop" }), "autre-valeur-privee"]) {
      const d = decrireCle(cle, URL_PROJET);
      expect(d).not.toContain("CorpsSecret999");
      expect(d).not.toContain("signature-secrete-xyz");
      expect(d).not.toContain("autre-valeur-privee");
    }
  });
});

describe("decrireAdresse", () => {
  test("adresse d'un projet Supabase : ok", () => {
    expect(decrireAdresse(URL_PROJET)).toBe("ok");
    expect(decrireAdresse(URL_PROJET + "/")).toBe("ok");
  });

  test("absente, ou avec espaces/guillemets, ou qui n'est pas une adresse Supabase", () => {
    expect(decrireAdresse(undefined)).toBe("absente");
    expect(decrireAdresse(`"${URL_PROJET}"`)).toContain("espaces, guillemets");
    expect(decrireAdresse("http://localhost:54321")).toBe("adresse inattendue : attendu https://<projet>.supabase.co");
    expect(decrireAdresse("https://exemple.com")).toBe("adresse inattendue : attendu https://<projet>.supabase.co");
  });
});

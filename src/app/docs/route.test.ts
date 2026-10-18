// @vitest-environment node
import { describe, expect, test } from "vitest";
import { GET as llms } from "../llms.txt/route";
import { GET as readme } from "../readme/route";
import { GET as docs } from "./route";

const appeler = (handler: (r: Request) => Promise<Response>, chemin: string) =>
  handler(new Request(`https://cuisine.test${chemin}`));

describe("documentation pour Claude", () => {
  test("/docs : texte lisible par Claude, avec l'adresse du site", async () => {
    const res = await appeler(docs, "/docs");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    const texte = await res.text();
    expect(texte).toContain("https://cuisine.test/api/recettes?q=");
    expect(texte).toContain("https://cuisine.test/api/recettes/");
  });

  test("/readme et /llms.txt renvoient exactement la même documentation", async () => {
    const [d, r, l] = await Promise.all([
      appeler(docs, "/docs").then((x) => x.text()),
      appeler(readme, "/readme").then((x) => x.text()),
      appeler(llms, "/llms.txt").then((x) => x.text()),
    ]);
    expect(r).toBe(d);
    expect(l).toBe(d);
  });
});

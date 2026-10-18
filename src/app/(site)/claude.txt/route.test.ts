// @vitest-environment node
import { describe, expect, test } from "vitest";
import { GET } from "./route";

describe("GET /claude.txt", () => {
  test("renvoie les instructions en texte brut avec l'adresse du site", async () => {
    const res = await GET(new Request("https://cuisine.test/claude.txt"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(await res.text()).toContain("https://cuisine.test/api/recettes?q=");
  });
});

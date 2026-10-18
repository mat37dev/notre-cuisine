import { describe, expect, test } from "vitest";
import nextConfig from "../../next.config";
import robots from "./robots";

describe("indexation", () => {
  test("robots.txt laisse lire le site (Claude doit pouvoir le consulter) sauf les pages d'administration", () => {
    const regles = robots().rules;
    const r = Array.isArray(regles) ? regles[0] : regles;
    expect(r.userAgent).toBe("*");
    expect(r.allow).toBe("/");
    expect(r.disallow).not.toContain("/");
    expect(r.disallow).toEqual(expect.arrayContaining(["/admin", "/invite/"]));
  });

  test("toutes les pages portent X-Robots-Tag: noindex, nofollow", async () => {
    const regles = await nextConfig.headers!();
    const toutes = regles.find((r) => r.source === "/:path*");
    expect(toutes?.headers).toContainEqual({ key: "X-Robots-Tag", value: "noindex, nofollow" });
  });
});

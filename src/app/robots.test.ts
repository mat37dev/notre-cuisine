import { describe, expect, test } from "vitest";
import nextConfig from "../../next.config";
import robots from "./robots";

describe("indexation", () => {
  test("robots.txt interdit tout aux moteurs de recherche", () => {
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });

  test("toutes les pages portent X-Robots-Tag: noindex, nofollow", async () => {
    const regles = await nextConfig.headers!();
    const toutes = regles.find((r) => r.source === "/:path*");
    expect(toutes?.headers).toContainEqual({ key: "X-Robots-Tag", value: "noindex, nofollow" });
  });
});

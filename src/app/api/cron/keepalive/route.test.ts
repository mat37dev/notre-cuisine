// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { setStoreForTests } from "@/lib/store";
import { MemoryStore } from "@/lib/store/memory";
import { GET } from "./route";

let store: MemoryStore;
beforeEach(() => {
  store = new MemoryStore();
  setStoreForTests(store);
  vi.stubEnv("CRON_SECRET", "secret-de-test");
});
afterEach(() => {
  setStoreForTests(null);
  vi.unstubAllEnvs();
});

const appeler = (authorization?: string) =>
  GET(new Request("https://x.test/api/cron/keepalive", { headers: authorization ? { authorization } : {} }));

describe("GET /api/cron/keepalive", () => {
  test("sans secret ou avec un mauvais secret : 401 et la base n'est pas touchée", async () => {
    const ping = vi.spyOn(store, "ping");
    expect((await appeler()).status).toBe(401);
    expect((await appeler("Bearer mauvais")).status).toBe(401);
    expect(ping).not.toHaveBeenCalled();
  });

  test("bon secret : 200 et la base est appelée", async () => {
    const ping = vi.spyOn(store, "ping");
    const res = await appeler("Bearer secret-de-test");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(ping).toHaveBeenCalledTimes(1);
  });

  test("CRON_SECRET non défini : toujours 401, même avec « Bearer undefined »", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await appeler("Bearer undefined")).status).toBe(401);
    expect((await appeler("Bearer ")).status).toBe(401);
  });

  test("vercel.json planifie cette adresse chaque semaine", () => {
    const conf = JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8"));
    expect(conf.crons).toEqual([{ path: "/api/cron/keepalive", schedule: "0 6 * * 1" }]);
  });
});

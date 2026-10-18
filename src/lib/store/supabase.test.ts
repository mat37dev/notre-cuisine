import { createClient } from "@supabase/supabase-js";
import { describe, test } from "vitest";
import { runStoreContract } from "./contract";
import { SupabaseStore } from "./supabase";

// ATTENTION : ces tests VIDENT toutes les tables du projet visé. Ils ne tournent que si les trois
// variables ci-dessous sont définies : à utiliser sur un projet de test ou avant d'y mettre de vraies recettes.
const url = process.env.SUPABASE_TEST_URL;
const cle = process.env.SUPABASE_TEST_KEY;

if (url && cle && process.env.SUPABASE_TEST_WIPE === "oui") {
  const db = createClient(url, cle, { auth: { persistSession: false } });
  runStoreContract("Supabase", async () => {
    for (const table of ["submissions", "devices", "invites", "recipes", "profiles"]) {
      const { error } = await db.from(table).delete().not("id", "is", null);
      if (error) throw new Error(`Nettoyage de ${table} : ${error.message}`);
    }
    return new SupabaseStore(url, cle);
  });
} else {
  describe.skip("Store (Supabase)", () => {
    test("ignoré : SUPABASE_TEST_URL, SUPABASE_TEST_KEY et SUPABASE_TEST_WIPE=oui requis", () => {});
  });
}

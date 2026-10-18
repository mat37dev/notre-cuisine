import { describe, expect, test } from "vitest";
import { parseInviteArgs } from "./invite-cli";

describe("parseInviteArgs", () => {
  test("admin avec nom", () => {
    expect(parseInviteArgs(["--role", "admin", "--name", "Mathieu"])).toEqual({
      role: "admin",
      name: "Mathieu",
      label: "Premier appareil",
    });
  });

  test("membre avec nom et libellé", () => {
    expect(parseInviteArgs(["--role", "member", "--name", "Camille", "--label", "Téléphone"])).toEqual({
      role: "member",
      name: "Camille",
      label: "Téléphone",
    });
  });

  test("rôle par défaut : membre", () => {
    expect(parseInviteArgs(["--name", "Camille"])).toMatchObject({ role: "member" });
  });

  test("nom manquant", () => {
    expect(parseInviteArgs(["--role", "admin"])).toEqual({ error: "Il manque --name (le prénom de la personne)." });
  });

  test("rôle inconnu", () => {
    expect(parseInviteArgs(["--role", "chef", "--name", "X"])).toEqual({
      error: "Le rôle doit être « admin » ou « member ».",
    });
  });
});

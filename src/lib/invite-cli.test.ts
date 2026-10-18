import { describe, expect, test } from "vitest";
import { parseInviteArgs, trouverProfil } from "./invite-cli";

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

describe("--existing : un nouvel appareil pour une personne déjà inscrite", () => {
  test("le drapeau est lu, et absent par défaut", () => {
    expect(parseInviteArgs(["--name", "Mathieu", "--existing"])).toMatchObject({ existing: true });
    expect(parseInviteArgs(["--name", "Mathieu"])).not.toHaveProperty("existing");
  });

  const profils = [
    { id: "1", name: "Mathieu", role: "admin" as const },
    { id: "2", name: "Camille", role: "member" as const },
  ];

  test("trouverProfil ignore la casse et les accents", () => {
    expect(trouverProfil(profils, "mathieu")).toEqual({ profil: profils[0] });
    expect(trouverProfil([{ id: "3", name: "Zoé", role: "member" }], "ZOE")).toMatchObject({ profil: { id: "3" } });
  });

  test("personne de ce nom : message clair avec les prénoms connus", () => {
    expect(trouverProfil(profils, "Léa")).toEqual({
      error: "Personne ne s'appelle « Léa ». Prénoms connus : Mathieu, Camille.",
    });
  });

  test("deux personnes du même prénom : on refuse de deviner", () => {
    const doublon = [...profils, { id: "4", name: "mathieu", role: "member" as const }];
    expect(trouverProfil(doublon, "Mathieu")).toMatchObject({ error: expect.stringContaining("plusieurs") });
  });
});

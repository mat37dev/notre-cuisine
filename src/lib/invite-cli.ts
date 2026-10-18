import type { Role } from "./store/types";

export type InviteArgs = { role: Role; name: string; label: string };

/** Lit `--role admin|member`, `--name Prénom`, `--label "Nom de l'appareil"`. */
export function parseInviteArgs(argv: string[]): InviteArgs | { error: string } {
  const valeur = (option: string) => {
    const i = argv.indexOf(option);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const role = valeur("--role") ?? "member";
  if (role !== "admin" && role !== "member") return { error: "Le rôle doit être « admin » ou « member »." };
  const name = valeur("--name")?.trim();
  if (!name) return { error: "Il manque --name (le prénom de la personne)." };
  return { role, name, label: valeur("--label")?.trim() || "Premier appareil" };
}

import type { Profile, Role } from "./store/types";

export type InviteArgs = { role: Role; name: string; label: string; existing?: true };

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
  const label = valeur("--label")?.trim() || (argv.includes("--existing") ? "Nouvel appareil" : "Premier appareil");
  return { role, name, label, ...(argv.includes("--existing") ? { existing: true as const } : {}) };
}

const simplifie = (texte: string) =>
  texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

/** Retrouve une personne déjà inscrite par son prénom (sans tenir compte des accents ni des majuscules). */
export function trouverProfil(profils: Profile[], name: string): { profil: Profile } | { error: string } {
  const trouves = profils.filter((p) => simplifie(p.name) === simplifie(name));
  if (trouves.length === 1) return { profil: trouves[0] };
  if (trouves.length > 1) return { error: `Il y a plusieurs personnes appelées « ${name} » : impossible de choisir.` };
  return { error: `Personne ne s'appelle « ${name} ». Prénoms connus : ${profils.map((p) => p.name).join(", ")}.` };
}

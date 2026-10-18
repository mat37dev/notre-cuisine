// Décrit la forme d'une clé ou d'une adresse Supabase SANS jamais en recopier le contenu :
// seul le type (sb_secret_, JWT service_role…) et l'identifiant de projet (public) sont donnés.

const PARASITES = /[\s"'`]/;

function lireJwt(cle: string): { role?: string; ref?: string } | null {
  const parties = cle.split(".");
  if (parties.length !== 3) return null;
  try {
    const charge = JSON.parse(Buffer.from(parties[1], "base64url").toString("utf8")) as { role?: unknown; ref?: unknown };
    return {
      role: typeof charge.role === "string" ? charge.role : undefined,
      ref: typeof charge.ref === "string" ? charge.ref : undefined,
    };
  } catch {
    return null;
  }
}

export function decrireAdresse(url: string | undefined): string {
  if (!url) return "absente";
  if (PARASITES.test(url)) return "contient des espaces, guillemets ou retours à la ligne : recopie-la sans";
  return /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url)
    ? "ok"
    : "adresse inattendue : attendu https://<projet>.supabase.co";
}

export function decrireCle(cle: string | undefined, url: string | undefined): string {
  if (!cle) return "absente";
  if (PARASITES.test(cle)) return "contient des espaces, guillemets ou retours à la ligne : recopie-la sans";
  if (cle.startsWith("sb_secret_")) return "clé secrète (sb_secret_…)";
  if (cle.startsWith("sb_publishable_")) return "clé publique (sb_publishable_…) : ce n'est pas la bonne, il faut la clé secrète";
  const jwt = lireJwt(cle);
  if (!jwt) return "format inconnu (ni sb_secret_, ni JWT)";
  if (jwt.role === "anon") return "ancienne clé anon : ce n'est pas la bonne, il faut la clé service_role";
  const projetDeLAdresse = url?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
  if (jwt.ref && projetDeLAdresse && jwt.ref !== projetDeLAdresse) {
    return `clé du projet ${jwt.ref}, qui est un autre projet que celui de SUPABASE_URL (${projetDeLAdresse})`;
  }
  return jwt.role === "service_role"
    ? `ancienne clé service_role du projet ${jwt.ref ?? "inconnu"}`
    : `clé JWT de rôle « ${jwt.role ?? "inconnu"} » : il faut service_role`;
}

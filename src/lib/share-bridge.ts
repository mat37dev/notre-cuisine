export const SHARE_STORAGE_KEY = "nc_partage";

// Séparateurs de ligne unicode : valides dans du JSON mais pas dans un littéral JavaScript ancien.
const LS = String.fromCharCode(0x2028);
const PS = String.fromCharCode(0x2029);

/**
 * Page renvoyée à Android quand on partage un texte vers l'appli : elle garde le texte dans
 * sessionStorage puis ouvre /ajouter. Le texte vient de l'extérieur : il est échappé pour qu'aucun
 * `</script>` ni HTML ne puisse s'exécuter.
 */
export function buildShareBridgeHtml(texte: string): string {
  const litteral = JSON.stringify(texte)
    .replace(/</g, "\\u003c")
    .split(LS)
    .join("\\u2028")
    .split(PS)
    .join("\\u2029");
  return `<!doctype html>
<html lang="fr">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ouverture de la recette…</title>
<body style="font-family:system-ui;padding:2rem">
<p>Ouverture de la recette…</p>
<script>
const texte = ${litteral};
try { sessionStorage.setItem("${SHARE_STORAGE_KEY}", texte); } catch (e) {}
location.replace("/ajouter?partage=1");
</script>
</body>
</html>
`;
}

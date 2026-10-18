import { buildShareBridgeHtml } from "@/lib/share-bridge";

/** Cible de partage Android (déclarée dans le manifeste) : reçoit le texte partagé et ouvre /ajouter. */
export async function POST(request: Request) {
  let texte = "";
  try {
    const form = await request.formData();
    const champ = (nom: string) => (typeof form.get(nom) === "string" ? (form.get(nom) as string) : "");
    texte = champ("text") || champ("url") || champ("title");
  } catch {
    // corps illisible : on ouvre quand même la page « Ajouter », vide
  }
  return new Response(buildShareBridgeHtml(texte), {
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

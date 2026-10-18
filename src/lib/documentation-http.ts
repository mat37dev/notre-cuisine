import { originOf } from "./http";
import { documentationClaude } from "./recipe/prompts";

/** Réponse commune à /docs, /readme et /llms.txt : la documentation, en texte brut pour que Claude la lise facilement. */
export function reponseDocumentation(request: Request): Response {
  return new Response(documentationClaude(originOf(request)), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=300" },
  });
}

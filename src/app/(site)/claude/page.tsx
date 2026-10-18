import type { Metadata } from "next";
import { CopyButton } from "@/components/CopyButton";
import { getOrigin } from "@/lib/origin";
import { instructionsClaude } from "@/lib/recipe/prompts";

export const metadata: Metadata = { title: "Instructions pour Claude" };

export default async function PageClaude() {
  const origin = await getOrigin();
  const instructions = instructionsClaude(origin);
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <h1 className="titre text-3xl">Instructions pour Claude</h1>
      <p>
        Copie ce texte et colle-le dans une conversation avec Claude (ou dans les instructions d’un Projet). Ensuite,
        chaque recette finale se terminera par un bloc que tu pourras envoyer ici, et Claude saura retrouver les
        recettes du site.
      </p>
      <CopyButton text={instructions} label="Copier les instructions" />
      <pre className="carte overflow-x-auto whitespace-pre-wrap p-4 text-sm">
        {instructions}
      </pre>
      <p className="text-sm text-muted">
        Même texte, en version brute : <a className="underline" href="/claude.txt">/claude.txt</a>. La documentation
        complète que Claude peut lire lui-même est sur <a className="underline" href="/docs">/docs</a> (aussi
        /readme et /llms.txt) : donne-lui simplement cette adresse.
      </p>
    </main>
  );
}

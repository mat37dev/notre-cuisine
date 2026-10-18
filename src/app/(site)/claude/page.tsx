import type { Metadata } from "next";
import { CopyButton } from "@/components/CopyButton";
import { getOrigin } from "@/lib/origin";
import { instructionsClaude } from "@/lib/recipe/prompts";

export const metadata: Metadata = { title: "Instructions pour Claude" };

export default async function PageClaude() {
  const origin = await getOrigin();
  const instructions = instructionsClaude(origin);
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">Instructions pour Claude</h1>
      <p>
        Copie ce texte et colle-le dans une conversation avec Claude (ou dans les instructions d’un Projet). Ensuite,
        chaque recette finale se terminera par un bloc que tu pourras envoyer ici, et Claude saura retrouver les
        recettes du site.
      </p>
      <CopyButton text={instructions} label="Copier les instructions" />
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-neutral-100 p-3 text-sm dark:bg-neutral-800">
        {instructions}
      </pre>
      <p className="text-sm text-neutral-500">
        Même texte, en version brute : <a className="underline" href="/claude.txt">/claude.txt</a>
      </p>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { AddRecipeForm } from "@/components/AddRecipeForm";
import { getCurrentViewer } from "@/lib/session";

export const metadata: Metadata = { title: "Ajouter une recette" };

export default async function PageAjouter({ searchParams }: { searchParams: Promise<{ text?: string }> }) {
  const { text } = await searchParams;
  const viewer = await getCurrentViewer();
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <h1 className="titre text-3xl">Ajouter une recette</h1>
      <p className="text-muted">
        Demande ta recette à Claude, copie sa réponse (ou partage-la vers cette appli) et colle-la ici.{" "}
        {viewer.role === "visitor"
          ? "Cet appareil n’est pas encore reconnu : ta recette attendra d’être validée avant d’apparaître."
          : "Cet appareil est reconnu : ta recette sera publiée tout de suite."}
      </p>
      <p className="text-sm">
        Pas encore configuré ? Les{" "}
        <Link href="/claude" className="font-semibold text-brand underline">
          instructions pour Claude
        </Link>{" "}
        sont à coller une fois dans ta conversation.
      </p>
      <AddRecipeForm initialText={text ?? ""} />
    </main>
  );
}

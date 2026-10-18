import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton, InviteForm } from "@/components/AdminActions";
import { LIBELLES_CATEGORIES } from "@/lib/recipe/labels";
import { listPending } from "@/lib/service";
import { getCurrentViewer } from "@/lib/session";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Administration" };

const date = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default async function PageAdmin() {
  const viewer = await getCurrentViewer();
  if (viewer.role !== "admin") notFound();
  const store = getStore();
  const [enAttente, profils, appareils] = await Promise.all([
    listPending(store, viewer),
    store.listProfiles(),
    store.listDevices(),
  ]);
  const attente = enAttente.ok ? enAttente.value : [];

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-4">
      <h1 className="text-2xl font-bold">Administration</h1>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Recettes en attente ({attente.length})</h2>
        {attente.length === 0 ? (
          <p className="text-neutral-500">Rien à valider pour le moment.</p>
        ) : (
          <ul className="space-y-3">
            {attente.map((row) => (
              <li key={row.id} className="space-y-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                <p className="text-xs font-medium uppercase tracking-wide text-orange-700 dark:text-orange-300">
                  {LIBELLES_CATEGORIES[row.recipe.categorie]} · envoyée le {date(row.createdAt)}
                </p>
                <Link href={`/recettes/${row.slug}`} className="text-lg font-semibold underline">
                  {row.recipe.titre}
                </Link>
                <div className="flex flex-wrap gap-2">
                  <ActionButton url={`/api/admin/valider/${row.id}`} label="Valider" style="primaire" />
                  <Link
                    href={`/recettes/${row.slug}/modifier`}
                    className="inline-flex min-h-11 items-center rounded-lg border border-neutral-400 px-4 font-medium"
                  >
                    Modifier
                  </Link>
                  <ActionButton
                    url={`/api/admin/refuser/${row.id}`}
                    label="Refuser"
                    style="danger"
                    confirm="Refuser et supprimer cette recette ?"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Personnes et appareils</h2>
        <ul className="space-y-4">
          {profils.map((p) => {
            const siens = appareils.filter((d) => d.profileId === p.id && d.revokedAt === null);
            return (
              <li key={p.id} className="space-y-2 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                <p className="font-semibold">
                  {p.name} <span className="font-normal text-neutral-500">({p.role === "admin" ? "admin" : "membre"})</span>
                </p>
                {siens.length === 0 ? (
                  <p className="text-sm text-neutral-500">Aucun appareil reconnu.</p>
                ) : (
                  <ul className="space-y-2">
                    {siens.map((d) => (
                      <li key={d.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          {d.label}
                          <span className="block text-sm text-neutral-500">
                            reconnu le {date(d.createdAt)}, vu le {date(d.lastSeenAt)}
                          </span>
                        </span>
                        <ActionButton
                          url={`/api/admin/appareils/${d.id}/retirer`}
                          label="Retirer"
                          style="danger"
                          confirm={`Retirer l'appareil « ${d.label} » de ${p.name} ?`}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                <InviteForm profilId={p.id} profilNom={p.name} />
              </li>
            );
          })}
        </ul>
        <div className="space-y-2 rounded-xl border border-dashed border-neutral-400 p-4">
          <h3 className="font-semibold">Inviter quelqu’un</h3>
          <InviteForm />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Sauvegarde</h2>
        <p className="text-sm text-neutral-500">Télécharge toutes les recettes (publiées et en attente) dans un fichier.</p>
        <a
          href="/api/admin/export"
          download
          className="inline-flex min-h-11 items-center rounded-lg border border-neutral-400 px-4 font-medium"
        >
          Exporter les recettes
        </a>
      </section>
    </main>
  );
}

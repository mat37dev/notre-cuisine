import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionButton, InviteForm } from "@/components/AdminActions";
import { InstallButton } from "@/components/InstallButton";
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
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-6">
      <h1 className="titre text-3xl">Administration</h1>

      <section className="space-y-3">
        <h2 className="titre text-2xl">Recettes en attente ({attente.length})</h2>
        {attente.length === 0 ? (
          <p className="text-muted">Rien à valider pour le moment.</p>
        ) : (
          <ul className="space-y-3">
            {attente.map((row) => (
              <li key={row.id} className="carte space-y-2 p-4">
                <p className="badge">
                  {LIBELLES_CATEGORIES[row.recipe.categorie]} · envoyée le {date(row.createdAt)}
                </p>
                <Link href={`/recettes/${row.slug}`} className="titre text-xl underline">
                  {row.recipe.titre}
                </Link>
                <div className="flex flex-wrap gap-2">
                  <ActionButton url={`/api/admin/valider/${row.id}`} label="Valider" style="primaire" />
                  <Link
                    href={`/recettes/${row.slug}/modifier`}
                    className="btn btn-secondary"
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
        <h2 className="titre text-2xl">Personnes et appareils</h2>
        <ul className="space-y-4">
          {profils.map((p) => {
            const siens = appareils.filter((d) => d.profileId === p.id && d.revokedAt === null);
            return (
              <li key={p.id} className="carte space-y-2 p-4">
                <p className="font-semibold">
                  {p.name} <span className="font-normal text-muted">({p.role === "admin" ? "admin" : "membre"})</span>
                </p>
                {siens.length === 0 ? (
                  <p className="text-sm text-muted">Aucun appareil ni jeton.</p>
                ) : (
                  <ul className="space-y-2">
                    {siens.map((d) => (
                      <li key={d.id} className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          {d.label}
                          {d.kind === "jeton" && <span className="badge ml-2">Jeton Claude</span>}
                          <span className="block text-sm text-muted">
                            {d.kind === "jeton" ? "créé" : "reconnu"} le {date(d.createdAt)}, vu le {date(d.lastSeenAt)}
                          </span>
                        </span>
                        <ActionButton
                          url={`/api/admin/appareils/${d.id}/retirer`}
                          label="Retirer"
                          style="danger"
                          confirm={`Retirer ${d.kind === "jeton" ? "le jeton" : "l'appareil"} « ${d.label} » de ${p.name} ?`}
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
        <div className="carte space-y-2 border-dashed p-4">
          <h3 className="font-bold">Inviter quelqu’un</h3>
          <InviteForm />
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="titre text-2xl">Installer l’appli</h2>
        <p className="text-sm text-muted">
          Une icône « Notre cuisine » sur l’écran d’accueil de cet appareil, qui s’ouvre en plein écran.
        </p>
        <InstallButton />
      </section>

      <section className="space-y-2">
        <h2 className="titre text-2xl">Sauvegarde</h2>
        <p className="text-sm text-muted">Télécharge toutes les recettes (publiées et en attente) dans un fichier.</p>
        <a
          href="/api/admin/export"
          download
          className="btn btn-secondary"
        >
          Exporter les recettes
        </a>
      </section>
    </main>
  );
}

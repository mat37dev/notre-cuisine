import type { Metadata } from "next";
import { ActionButton, InviteForm } from "@/components/AdminActions";
import { InstallButton } from "@/components/InstallButton";
import { getCurrentViewer } from "@/lib/session";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Mon compte" };

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default async function PageCompte() {
  const viewer = await getCurrentViewer();

  if (viewer.role === "visitor" || !viewer.profileId) {
    return (
      <main className="mx-auto max-w-3xl space-y-3 p-4">
        <h1 className="titre text-3xl">Mon compte</h1>
        <p>
          Cet appareil n’est pas reconnu. Pour que tes recettes soient publiées tout de suite, demande un lien
          d’invitation à la personne qui gère le site, ouvre-le sur cet appareil et appuie sur « Reconnaître cet
          appareil ».
        </p>
      </main>
    );
  }

  const appareils = (await getStore().listDevices()).filter(
    (d) => d.profileId === viewer.profileId && d.revokedAt === null,
  );

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-4">
      <header className="space-y-1">
        <h1 className="titre text-3xl">Mon compte</h1>
        <p className="text-muted">
          Connecté en tant que <strong>{viewer.name}</strong> ({viewer.role === "admin" ? "administrateur" : "membre"}).
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="titre text-xl">Mes appareils</h2>
        <p className="text-sm text-muted">
          Chaque appareil reconnu (téléphone, ordinateur, tablette) publie tes recettes sans attendre. Pour en ajouter
          un, crée un lien et ouvre-le sur le nouvel appareil.
        </p>
        <ul className="space-y-3">
          {appareils.map((d) => {
            const courant = d.id === viewer.deviceId;
            return (
              <li key={d.id} className="carte flex flex-wrap items-center justify-between gap-3 p-4">
                <span>
                  <span className="font-semibold">{d.label}</span>
                  {courant && <span className="badge ml-2">Cet appareil</span>}
                  <span className="block text-sm text-muted">
                    reconnu le {date(d.createdAt)}, vu le {date(d.lastSeenAt)}
                  </span>
                </span>
                <ActionButton
                  url={`/api/compte/appareils/${d.id}/retirer`}
                  label="Retirer"
                  style="danger"
                  confirm={
                    courant
                      ? "Retirer l'appareil que tu utilises ? Tu seras déconnecté et il faudra un nouveau lien."
                      : `Retirer l'appareil « ${d.label} » ?`
                  }
                />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="carte space-y-3 p-4">
        <h2 className="titre text-xl">Installer l’appli sur cet appareil</h2>
        <p className="text-sm text-muted">
          Une icône « Notre cuisine » sur l’écran d’accueil, qui s’ouvre en plein écran comme une vraie appli.
        </p>
        <InstallButton />
      </section>

      <section className="carte space-y-3 p-4">
        <h2 className="titre text-xl">Ajouter un appareil</h2>
        <InviteForm endpoint="/api/compte/inviter" avecNomAppareil />
      </section>
    </main>
  );
}

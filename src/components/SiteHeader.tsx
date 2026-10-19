import Link from "next/link";
import { InstallButton } from "./InstallButton";
import { getCurrentViewer } from "@/lib/session";

export async function SiteHeader() {
  const viewer = await getCurrentViewer();
  const lien = "whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-semibold hover:bg-brand-doux";
  return (
    <header className="entete-site sticky top-0 z-20 border-b border-ligne bg-fond/85 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2">
        <Link href="/" className="flex min-w-0 items-center gap-2 whitespace-nowrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={34} height={34} className="shrink-0 rounded-lg" />
          <span className="titre truncate text-lg sm:text-xl">Notre cuisine</span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <InstallButton variante="entete" />
          {/* Sur téléphone, ces liens sont dans la barre du bas (BottomNav) : l'en-tête reste léger. */}
          <div className="hidden items-center gap-1 sm:flex">
            {viewer.name && (
              <Link href="/compte" className={lien} aria-label={`Mon compte (${viewer.name})`}>
                {viewer.name}
              </Link>
            )}
            {viewer.role === "admin" && (
              <Link href="/admin" className={lien}>
                Admin
              </Link>
            )}
            <Link href="/ajouter" className="btn btn-primary !min-h-10 !px-3.5 whitespace-nowrap text-sm">
              + Ajouter
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}

import Link from "next/link";
import { InstallButton } from "./InstallButton";
import { getCurrentViewer } from "@/lib/session";

export async function SiteHeader() {
  const viewer = await getCurrentViewer();
  const lien = "whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-semibold hover:bg-brand-doux";
  return (
    <header className="entete-site sticky top-0 z-20 border-b border-ligne bg-fond/85 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2">
        <Link href="/" className="flex items-center gap-2 whitespace-nowrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={34} height={34} className="rounded-lg" />
          <span className="titre text-base sm:text-xl">Notre cuisine</span>
        </Link>
        <div className="flex items-center gap-0.5 sm:gap-1">
          {viewer.name && (
            <Link href="/compte" className={lien} aria-label={`Mon compte (${viewer.name})`}>
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="sm:hidden"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
              </svg>
              <span aria-hidden className="hidden sm:inline">
                {viewer.name}
              </span>
            </Link>
          )}
          {viewer.role === "admin" && (
            <Link href="/admin" className={lien}>
              Admin
            </Link>
          )}
          <InstallButton variante="entete" />
          <Link href="/ajouter" className="btn btn-primary !min-h-10 !px-3.5 whitespace-nowrap text-sm">
            + Ajouter
          </Link>
        </div>
      </nav>
    </header>
  );
}

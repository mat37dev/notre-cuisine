import Link from "next/link";
import { getCurrentViewer } from "@/lib/session";

export async function SiteHeader() {
  const viewer = await getCurrentViewer();
  const lien = "rounded-lg px-3 py-2 font-medium hover:bg-orange-100 dark:hover:bg-neutral-800";
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <nav className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-2">
        <Link href="/" className="text-lg font-bold">
          🍳 Notre cuisine
        </Link>
        <div className="flex items-center gap-1 text-sm">
          {viewer.name && <span className="hidden text-neutral-500 sm:inline">{viewer.name}</span>}
          <Link href="/ajouter" className={lien}>
            Ajouter
          </Link>
          {viewer.role === "admin" && (
            <Link href="/admin" className={lien}>
              Admin
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

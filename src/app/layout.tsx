import type { Metadata, Viewport } from "next";
import { Fraunces, Geist_Mono, Nunito } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import { RegisterSW } from "@/components/RegisterSW";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurrentViewer } from "@/lib/session";
import "./globals.css";

const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Notre cuisine", template: "%s · Notre cuisine" },
  description: "Nos recettes, au même endroit.",
};

export const viewport: Viewport = {
  themeColor: "#ecdcc0",
  viewportFit: "cover", // plein écran sur les téléphones à encoche : la barre du bas gère la zone de sécurité
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const viewer = await getCurrentViewer();
  return (
    <html lang="fr" className={`${nunito.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <footer className="pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-6 text-center text-sm text-muted sm:pb-6">Fait maison, avec amour 🧡</footer>
        <BottomNav admin={viewer.role === "admin"} />
        <RegisterSW />
      </body>
    </html>
  );
}

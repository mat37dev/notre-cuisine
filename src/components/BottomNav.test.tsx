import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { BottomNav } from "./BottomNav";

let chemin = "/";
vi.mock("next/navigation", () => ({ usePathname: () => chemin }));
beforeEach(() => {
  chemin = "/";
});

describe("BottomNav : barre de navigation du téléphone", () => {
  test("Recettes, Ajouter et Compte, dans cet ordre, pour tout le monde", () => {
    render(<BottomNav admin={false} />);
    const liens = screen.getAllByRole("link");
    expect(liens.map((l) => l.textContent?.trim())).toEqual(["Recettes", "Ajouter", "Compte"]);
    expect(liens.map((l) => l.getAttribute("href"))).toEqual(["/", "/ajouter", "/compte"]);
  });

  test("l'admin a un lien Admin de plus", () => {
    render(<BottomNav admin />);
    expect(screen.getByRole("link", { name: "Admin" })).toHaveAttribute("href", "/admin");
  });

  test("la page courante est signalée (aria-current), y compris pour une sous-page", () => {
    chemin = "/recettes/tarte";
    const { rerender } = render(<BottomNav admin={false} />);
    expect(screen.getByRole("link", { name: "Recettes" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Ajouter" })).not.toHaveAttribute("aria-current");

    chemin = "/compte";
    rerender(<BottomNav admin={false} />);
    expect(screen.getByRole("link", { name: "Compte" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Recettes" })).not.toHaveAttribute("aria-current");
  });

  test("n'apparaît que sur téléphone : masquée dès l'écran « sm »", () => {
    render(<BottomNav admin={false} />);
    expect(screen.getByRole("navigation", { name: "Menu principal" })).toHaveClass("sm:hidden");
  });
});

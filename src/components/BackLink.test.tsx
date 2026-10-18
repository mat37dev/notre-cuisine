import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { BackLink } from "./BackLink";

const back = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ back, push: vi.fn() }) }));

function simuler(referrer: string, longueurHistorique: number) {
  Object.defineProperty(document, "referrer", { value: referrer, configurable: true });
  Object.defineProperty(window.history, "length", { value: longueurHistorique, configurable: true });
}

beforeEach(() => back.mockReset());
afterEach(() => {
  Object.defineProperty(document, "referrer", { value: "", configurable: true });
  Object.defineProperty(window.history, "length", { value: 1, configurable: true });
});

describe("BackLink : flèche de retour", () => {
  test("un lien « Retour » avec une flèche, qui pointe vers la liste si le retour est impossible", () => {
    render(<BackLink />);
    const lien = screen.getByRole("link", { name: "Retour" });
    expect(lien).toHaveAttribute("href", "/");
    expect(lien.querySelector("[aria-hidden]")).toHaveTextContent("←");
  });

  test("on arrive depuis une page du site : le clic revient en arrière (la liste retrouve ses filtres)", () => {
    simuler(`${window.location.origin}/?categorie=dessert`, 3);
    render(<BackLink />);
    const clic = fireEvent.click(screen.getByRole("link", { name: "Retour" }));
    expect(back).toHaveBeenCalledTimes(1);
    expect(clic).toBe(false); // navigation par défaut annulée : pas de double déplacement
  });

  test("on arrive d'ailleurs (lien reçu, marque-page) : le clic suit le lien vers la liste", () => {
    simuler("https://autre-site.example/page", 3);
    render(<BackLink />);
    const clic = fireEvent.click(screen.getByRole("link", { name: "Retour" }));
    expect(back).not.toHaveBeenCalled();
    expect(clic).toBe(true);
  });

  test("onglet ouvert directement sur la recette (pas de page précédente) : le clic suit le lien", () => {
    simuler("", 1);
    render(<BackLink />);
    expect(fireEvent.click(screen.getByRole("link", { name: "Retour" }))).toBe(true);
    expect(back).not.toHaveBeenCalled();
  });

  test("adresse de repli et texte personnalisables (page de modification → la recette)", () => {
    render(<BackLink repli="/recettes/tarte" libelle="Retour à la recette" />);
    const lien = screen.getByRole("link", { name: "Retour à la recette" });
    expect(lien).toHaveAttribute("href", "/recettes/tarte");
  });

  test("un clic avec Ctrl ou Cmd (ouvrir dans un autre onglet) n'est pas détourné", () => {
    simuler(`${window.location.origin}/`, 3);
    render(<BackLink />);
    expect(fireEvent.click(screen.getByRole("link", { name: "Retour" }), { ctrlKey: true })).toBe(true);
    expect(back).not.toHaveBeenCalled();
  });
});

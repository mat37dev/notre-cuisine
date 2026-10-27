import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { CopyButton } from "./CopyButton";

afterEach(() => vi.restoreAllMocks());

describe("CopyButton", () => {
  test("copie le texte puis affiche « Copié ! »", async () => {
    const user = userEvent.setup(); // installe un presse-papiers factice dans navigator
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    render(<CopyButton text="Bonjour" label="Copier les instructions" />);
    await user.click(screen.getByRole("button", { name: "Copier les instructions" }));
    expect(writeText).toHaveBeenCalledWith("Bonjour");
    expect(await screen.findByRole("button", { name: "Copié !" })).toBeInTheDocument();
  });

  test("si la copie échoue, le dit au lieu de faire semblant", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("refusé"));
    render(<CopyButton text="Bonjour" label="Copier" />);
    await user.click(screen.getByRole("button", { name: "Copier" }));
    expect(await screen.findByRole("button", { name: "Copie impossible, sélectionne le texte" })).toBeInTheDocument();
  });
});

describe("CopyButton : apparence", () => {
  test("base remplace les classes du bouton principal", () => {
    render(<CopyButton text="x" label="Copier" base="btn btn-variante" />);
    const bouton = screen.getByRole("button", { name: "Copier" });
    expect(bouton).toHaveClass("btn-variante");
    expect(bouton).not.toHaveClass("btn-primary");
  });

  test("ariaLabel donne un nom lisible à un bouton dont le texte est un symbole", () => {
    render(<CopyButton text="x" label="＋" ariaLabel="Proposer une variante" />);
    expect(screen.getByRole("button", { name: "Proposer une variante" })).toHaveTextContent("＋");
  });
});

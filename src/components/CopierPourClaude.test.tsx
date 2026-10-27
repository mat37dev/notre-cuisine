import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { CopierPourClaude } from "./CopierPourClaude";

afterEach(() => vi.restoreAllMocks());

const etapes = ["Ouvre Claude et colle le message.", "Écris ce que tu veux changer.", "Colle sa réponse dans « Ajouter »."];

describe("CopierPourClaude", () => {
  test("copie le message et ouvre l'encadré qui dit quoi en faire", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    render(<CopierPourClaude text="Fais une variante" label="＋ Proposer une variante" etapes={etapes} />);
    const bouton = screen.getByRole("button", { name: "＋ Proposer une variante" });
    expect(bouton).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("status")).toBeNull();

    await user.click(bouton);
    expect(writeText).toHaveBeenCalledWith("Fais une variante");
    expect(bouton).toHaveAttribute("aria-expanded", "true");
    const encadre = within(await screen.findByRole("status"));
    expect(encadre.getByText("✓ Message copié")).toBeInTheDocument();
    expect(encadre.getAllByRole("listitem").map((li) => li.textContent)).toEqual(etapes.map((e, i) => `${i + 1}${e}`));
    expect(encadre.getByRole("link", { name: "Ouvrir Claude ↗" })).toHaveAttribute("href", "https://claude.ai/new");
    expect(encadre.getByRole("link", { name: "Ajouter →" })).toHaveAttribute("href", "/ajouter");
  });

  test("« Copier à nouveau » recopie le message, « Fermer » ferme l'encadré", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    render(<CopierPourClaude text="Message" label="Modifier avec Claude" etapes={etapes} />);
    await user.click(screen.getByRole("button", { name: "Modifier avec Claude" }));
    await user.click(screen.getByRole("button", { name: "Copier à nouveau le message" }));
    expect(writeText).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.queryByRole("status")).toBeNull();
  });

  test("si la copie échoue, le dit et montre le message à copier à la main", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("refusé"));
    render(<CopierPourClaude text="Le message" label="Modifier avec Claude" etapes={etapes} />);
    await user.click(screen.getByRole("button", { name: "Modifier avec Claude" }));
    const encadre = within(await screen.findByRole("status"));
    expect(encadre.getByText(/La copie n’a pas marché/)).toBeInTheDocument();
    expect(encadre.getByRole("textbox", { name: "Message à copier" })).toHaveValue("Le message");
  });

  test("un seul encadré ouvert à la fois sur la page", async () => {
    const user = userEvent.setup();
    render(
      <>
        <CopierPourClaude text="a" label="Modifier avec Claude" etapes={etapes} />
        <CopierPourClaude text="b" label="Proposer une variante" etapes={etapes} />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Modifier avec Claude" }));
    await user.click(screen.getByRole("button", { name: "Proposer une variante" }));
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Modifier avec Claude" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Proposer une variante" })).toHaveAttribute("aria-expanded", "true");
  });
});

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { BandeauBienvenue } from "./BandeauBienvenue";

beforeEach(() => {
  window.history.replaceState(null, "", "/?bienvenue=1&categorie=dessert");
});
afterEach(() => vi.useRealTimers());

describe("BandeauBienvenue : notification après une invitation acceptée", () => {
  test("dit que l'appareil est reconnu et salue la personne", () => {
    render(<BandeauBienvenue nom="Camille" />);
    const bandeau = screen.getByRole("status");
    expect(bandeau).toHaveTextContent("Camille");
    expect(bandeau).toHaveTextContent(/appareil est reconnu/i);
  });

  test("retire « bienvenue » de l'adresse (un rechargement ne le réaffiche pas) en gardant le reste", () => {
    render(<BandeauBienvenue nom="Camille" />);
    expect(window.location.search).toBe("?categorie=dessert");
  });

  test("se ferme avec le bouton", async () => {
    const user = userEvent.setup();
    render(<BandeauBienvenue nom="Camille" />);
    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("disparaît tout seul au bout de quelques secondes", () => {
    vi.useFakeTimers();
    render(<BandeauBienvenue nom="Camille" />);
    act(() => vi.advanceTimersByTime(9000));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

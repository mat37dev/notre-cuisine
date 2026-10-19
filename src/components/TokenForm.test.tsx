import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TokenForm } from "./TokenForm";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));

const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  refresh.mockReset();
});

const reponse = (status: number, corps: unknown) =>
  Promise.resolve(new Response(JSON.stringify(corps), { status, headers: { "content-type": "application/json" } }));

describe("TokenForm : créer un jeton pour Claude", () => {
  test("envoie le nom choisi, puis affiche le jeton avec un avertissement : il ne sera plus montré", async () => {
    fetchMock.mockReturnValue(reponse(200, { jeton: "nc_secret123", id: "d1" }));
    const user = userEvent.setup();
    render(<TokenForm />);
    await user.type(screen.getByLabelText("Nom du jeton"), "Claude du PC");
    await user.click(screen.getByRole("button", { name: "Créer un jeton pour Claude" }));

    expect(await screen.findByText("nc_secret123")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/compte/jeton",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ label: "Claude du PC" }) }),
    );
    expect(screen.getByText(/ne sera plus affiché/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copier le jeton" })).toBeInTheDocument();
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  test("propose des consignes à coller à Claude : l'adresse de la doc et l'en-tête Authorization avec le jeton", async () => {
    fetchMock.mockReturnValue(reponse(200, { jeton: "nc_secret123", id: "d1" }));
    const user = userEvent.setup();
    render(<TokenForm />);
    await user.click(screen.getByRole("button", { name: "Créer un jeton pour Claude" }));
    const consignes = (await screen.findByLabelText("Consignes à coller à Claude")) as HTMLTextAreaElement;
    expect(consignes.value).toContain(`${window.location.origin}/docs`);
    expect(consignes.value).toContain("Authorization: Bearer nc_secret123");
    expect(screen.getByRole("button", { name: "Copier les consignes" })).toBeInTheDocument();
  });

  test("erreur du serveur (par exemple 5 jetons déjà actifs) : affichée, aucun jeton montré", async () => {
    fetchMock.mockReturnValue(reponse(409, { erreur: "Tu as déjà 5 jetons actifs." }));
    const user = userEvent.setup();
    render(<TokenForm />);
    await user.click(screen.getByRole("button", { name: "Créer un jeton pour Claude" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Tu as déjà 5 jetons actifs.");
    expect(screen.queryByText(/nc_/)).not.toBeInTheDocument();
  });
});

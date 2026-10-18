import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ActionButton, InviteForm } from "./AdminActions";

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

describe("ActionButton", () => {
  test("appelle l'adresse en POST puis rafraîchit la page", async () => {
    fetchMock.mockReturnValue(reponse(200, { ok: true }));
    const user = userEvent.setup();
    render(<ActionButton url="/api/admin/valider/abc" label="Valider" />);
    await user.click(screen.getByRole("button", { name: "Valider" }));
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/valider/abc", { method: "POST" });
  });

  test("avec confirmation : rien ne part si on annule", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<ActionButton url="/api/admin/refuser/abc" label="Refuser" confirm="Supprimer cette recette ?" />);
    await user.click(screen.getByRole("button", { name: "Refuser" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("erreur du serveur : affichée", async () => {
    fetchMock.mockReturnValue(reponse(404, { erreur: "Recette introuvable." }));
    const user = userEvent.setup();
    render(<ActionButton url="/api/admin/valider/abc" label="Valider" />);
    await user.click(screen.getByRole("button", { name: "Valider" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Recette introuvable.");
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("InviteForm", () => {
  test("nouvelle personne : envoie le nom et affiche le lien à copier", async () => {
    fetchMock.mockReturnValue(reponse(200, { lien: "https://x.test/invite/abc", profilId: "p1" }));
    const user = userEvent.setup();
    render(<InviteForm />);
    await user.type(screen.getByLabelText("Prénom"), "Léa");
    await user.click(screen.getByRole("button", { name: "Créer le lien d'invitation" }));
    expect(await screen.findByText("https://x.test/invite/abc")).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ nom: "Léa" });
    expect(screen.getByRole("button", { name: "Copier le lien" })).toBeInTheDocument();
  });

  test("autre appareil d'une personne existante : envoie son identifiant", async () => {
    fetchMock.mockReturnValue(reponse(200, { lien: "https://x.test/invite/def", profilId: "p1" }));
    const user = userEvent.setup();
    render(<InviteForm profilId="p1" profilNom="Camille" />);
    expect(screen.queryByLabelText("Prénom")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Inviter un autre appareil pour Camille" }));
    await screen.findByText("https://x.test/invite/def");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ profilId: "p1" });
  });
});

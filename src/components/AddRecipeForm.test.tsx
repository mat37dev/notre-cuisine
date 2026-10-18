import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { EXEMPLE_RECETTE } from "@/lib/recipe/prompts";
import { AddRecipeForm } from "./AddRecipeForm";

const bloc = (o: unknown) => "```json\n" + JSON.stringify(o) + "\n```";
const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  sessionStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const reponse = (status: number, corps: unknown) =>
  Promise.resolve(new Response(JSON.stringify(corps), { status, headers: { "content-type": "application/json" } }));

async function coller(texte: string) {
  const user = userEvent.setup();
  render(<AddRecipeForm />);
  const zone = screen.getByRole("textbox", { name: "Recette à envoyer" });
  await user.click(zone);
  await user.paste(texte);
  return user;
}

describe("AddRecipeForm : lecture en direct", () => {
  test("zone vide : aucune erreur et bouton Envoyer désactivé", () => {
    render(<AddRecipeForm />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Envoyer" })).toBeDisabled();
  });

  test("texte sans recette : message en français et bouton pour demander à Claude de corriger", async () => {
    await coller("Bonjour, juste une idée.");
    expect(screen.getByRole("alert")).toHaveTextContent("Je ne trouve pas de recette dans ce texte.");
    expect(screen.getByRole("button", { name: "Envoyer" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Copier un message pour Claude" })).toBeInTheDocument();
  });

  test("recette valide : aperçu et bouton Envoyer actif", async () => {
    await coller("Voilà !\n" + bloc(EXEMPLE_RECETTE));
    expect(screen.getByRole("heading", { name: "Salade italienne à la burrata" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Envoyer" })).toBeEnabled();
  });

  test("avertissement affiché sans bloquer l'envoi", async () => {
    await coller(bloc({ ...EXEMPLE_RECETTE, categorie: "brunch" }));
    expect(screen.getByText(/La catégorie est inconnue/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Envoyer" })).toBeEnabled();
  });

  test("recette avec un id : le bouton devient « Mettre à jour »", async () => {
    await coller(bloc({ ...EXEMPLE_RECETTE, id: "abc" }));
    expect(screen.getByRole("button", { name: "Mettre à jour" })).toBeEnabled();
  });
});

describe("AddRecipeForm : reprise du partage et presse-papiers", () => {
  test("reprend le texte partagé gardé dans sessionStorage, puis l'efface", async () => {
    sessionStorage.setItem("nc_partage", bloc(EXEMPLE_RECETTE));
    render(<AddRecipeForm />);
    expect(await screen.findByRole("heading", { name: "Salade italienne à la burrata" })).toBeInTheDocument();
    expect(sessionStorage.getItem("nc_partage")).toBeNull();
  });

  test("reprend le texte reçu en paramètre", async () => {
    render(<AddRecipeForm initialText={bloc(EXEMPLE_RECETTE)} />);
    expect(await screen.findByRole("heading", { name: "Salade italienne à la burrata" })).toBeInTheDocument();
  });

  test("« Coller depuis le presse-papiers » remplit la zone", async () => {
    const user = userEvent.setup();
    await navigator.clipboard.writeText(bloc(EXEMPLE_RECETTE));
    render(<AddRecipeForm />);
    await user.click(screen.getByRole("button", { name: "Coller depuis le presse-papiers" }));
    expect(await screen.findByRole("heading", { name: "Salade italienne à la burrata" })).toBeInTheDocument();
  });
});

describe("AddRecipeForm : envoi", () => {
  test("envoie le texte en POST ; 201 : publiée avec un lien", async () => {
    fetchMock.mockReturnValue(reponse(201, { id: "1", slug: "salade", status: "published", avertissements: [], lien: "/recettes/salade" }));
    const user = await coller(bloc(EXEMPLE_RECETTE));
    await user.click(screen.getByRole("button", { name: "Envoyer" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Recette publiée"));
    expect(screen.getByRole("link", { name: "Voir la recette" })).toHaveAttribute("href", "/recettes/salade");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/recettes");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body).texte).toContain("Salade italienne à la burrata");
  });

  test("202 : en attente de validation", async () => {
    fetchMock.mockReturnValue(reponse(202, { id: "1", slug: "salade", status: "pending", avertissements: [], lien: "/recettes/salade" }));
    const user = await coller(bloc(EXEMPLE_RECETTE));
    await user.click(screen.getByRole("button", { name: "Envoyer" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("en attente de validation"));
  });

  test("429 : message d'attente, rien de perdu (le texte reste)", async () => {
    fetchMock.mockReturnValue(reponse(429, { errors: ["Trop d'envois pour le moment, réessaie plus tard."] }));
    const user = await coller(bloc(EXEMPLE_RECETTE));
    await user.click(screen.getByRole("button", { name: "Envoyer" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Trop d'envois"));
    expect(screen.getByRole("textbox", { name: "Recette à envoyer" })).not.toHaveValue("");
  });

  test("réseau coupé : message clair", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const user = await coller(bloc(EXEMPLE_RECETTE));
    await user.click(screen.getByRole("button", { name: "Envoyer" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Impossible de joindre le site"));
  });
});

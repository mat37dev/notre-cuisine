import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { uneRecette } from "@/lib/recipe/fixtures";
import { RecipeEditor } from "./RecipeEditor";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal("fetch", fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  push.mockReset();
});

const reponse = (status: number, corps: unknown) =>
  Promise.resolve(new Response(JSON.stringify(corps), { status, headers: { "content-type": "application/json" } }));

const recette = () => uneRecette({ id: "id-1" });

describe("RecipeEditor", () => {
  test("affiche les champs de la recette", () => {
    render(<RecipeEditor recipe={recette()} slug="salade-burrata" />);
    expect(screen.getByLabelText("Titre")).toHaveValue("Salade burrata");
    expect(screen.getByLabelText("Portions")).toHaveValue(4);
    expect(screen.getByLabelText("Catégorie")).toHaveValue("salade");
    expect(screen.getAllByLabelText("Ingrédient")).toHaveLength(3);
    expect(screen.getAllByLabelText("Texte de l'étape")).toHaveLength(2);
  });

  test("enregistre : envoie la recette modifiée avec son id puis retourne à la recette", async () => {
    fetchMock.mockReturnValue(reponse(200, { id: "id-1", slug: "salade-burrata", status: "published", avertissements: [] }));
    const user = userEvent.setup();
    render(<RecipeEditor recipe={recette()} slug="salade-burrata" />);
    const titre = screen.getByLabelText("Titre");
    await user.clear(titre);
    await user.type(titre, "Salade corrigée");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/recettes/salade-burrata"));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/recettes");
    const envoye = JSON.parse(JSON.parse(init.body).texte.replace(/^```json\n|\n```$/g, ""));
    expect(envoye).toMatchObject({ id: "id-1", titre: "Salade corrigée", portions: 4, categorie: "salade" });
    expect(envoye.ingredients[1]).toMatchObject({ id: "tomates", nom: "tomates cerises", quantite: 400, unite: "g" });
    expect(envoye.etapes[1]).toMatchObject({ chrono_secondes: 150 });
  });

  test("ajoute un ingrédient et une étape, supprime un ingrédient", async () => {
    fetchMock.mockReturnValue(reponse(200, { slug: "salade-burrata" }));
    const user = userEvent.setup();
    render(<RecipeEditor recipe={recette()} slug="salade-burrata" />);
    await user.click(screen.getByRole("button", { name: "Ajouter un ingrédient" }));
    const noms = screen.getAllByLabelText("Ingrédient");
    expect(noms).toHaveLength(4);
    await user.type(noms[3], "basilic");
    await user.click(screen.getByRole("button", { name: "Ajouter une étape" }));
    const textes = screen.getAllByLabelText("Texte de l'étape");
    await user.type(textes[2], "Servir.");
    await user.click(screen.getAllByRole("button", { name: "Supprimer l'ingrédient" })[0]);
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const envoye = JSON.parse(JSON.parse(fetchMock.mock.calls[0][1].body).texte.replace(/^```json\n|\n```$/g, ""));
    expect(envoye.ingredients.map((i: { nom: string }) => i.nom)).toEqual(["tomates cerises", "pignons de pin", "basilic"]);
    expect(envoye.etapes).toHaveLength(3);
    expect(envoye.etapes[2].texte).toBe("Servir.");
  });

  test("erreurs du serveur affichées, la saisie reste", async () => {
    fetchMock.mockReturnValue(reponse(422, { errors: ["Il manque le titre."] }));
    const user = userEvent.setup();
    render(<RecipeEditor recipe={recette()} slug="salade-burrata" />);
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    const alerte = await screen.findByRole("alert");
    expect(within(alerte).getByText("Il manque le titre.")).toBeInTheDocument();
    expect(screen.getByLabelText("Titre")).toHaveValue("Salade burrata");
    expect(push).not.toHaveBeenCalled();
  });
});

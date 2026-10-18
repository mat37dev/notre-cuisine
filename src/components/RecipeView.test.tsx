import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { uneRecette } from "@/lib/recipe/fixtures";
import { RecipeView } from "./RecipeView";

describe("RecipeView", () => {
  test("affiche la recette pour son nombre de portions de départ", () => {
    render(<RecipeView recipe={uneRecette()} />);
    expect(screen.getByRole("heading", { name: "Salade burrata" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre de personnes")).toHaveTextContent("4");
    expect(screen.getByText("400 g")).toBeInTheDocument();
    expect(screen.getByText(/Couper 400 g de tomates/)).toBeInTheDocument();
  });

  test("trois clics sur « moins » : 1 personne, quantités divisées et lisibles", async () => {
    const user = userEvent.setup();
    render(<RecipeView recipe={uneRecette()} />);
    const moins = screen.getByRole("button", { name: "Moins de personnes" });
    await user.click(moins);
    await user.click(moins);
    await user.click(moins);
    expect(screen.getByLabelText("Nombre de personnes")).toHaveTextContent("1");
    expect(screen.getByText("100 g")).toBeInTheDocument();
    expect(screen.getByText(/Faire dorer 10 g de pignons/)).toBeInTheDocument();
    expect(moins).toBeDisabled();
  });

  test("« plus » augmente, jusqu'à 50 personnes", async () => {
    const user = userEvent.setup();
    render(<RecipeView recipe={uneRecette({ portions: 49 })} />);
    const plus = screen.getByRole("button", { name: "Plus de personnes" });
    await user.click(plus);
    expect(screen.getByLabelText("Nombre de personnes")).toHaveTextContent("50");
    expect(plus).toBeDisabled();
  });

  test("ingrédient sans quantité : « au goût »", () => {
    render(
      <RecipeView
        recipe={uneRecette({ ingredients: [{ id: "sel", nom: "sel", quantite: null, unite: "" }], etapes: [{ texte: "Saler." }] })}
      />,
    );
    expect(screen.getByText("au goût")).toBeInTheDocument();
  });

  test("une étape avec chrono propose une puce de chrono", () => {
    render(<RecipeView recipe={uneRecette()} />);
    expect(screen.getByRole("button", { name: /02:30/ })).toBeInTheDocument();
  });

  test("affiche la description et les notes", () => {
    render(<RecipeView recipe={uneRecette()} />);
    expect(screen.getByText("Une salade fraîche.")).toBeInTheDocument();
    expect(screen.getByText(/Sortir la burrata au dernier moment/)).toBeInTheDocument();
  });
});

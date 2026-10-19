import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { RecipeArt } from "./RecipeArt";

describe("RecipeArt : la photo, ou une illustration si elle ne charge pas", () => {
  test("avec une adresse d'image : affiche la photo, sans transmettre la page d'origine (certains sites bloquent sinon)", () => {
    render(<RecipeArt image="https://exemple.fr/tarte.jpg" titre="Tarte" categorie="dessert" />);
    const img = screen.getByRole("img", { name: "Tarte" });
    expect(img).toHaveAttribute("src", "https://exemple.fr/tarte.jpg");
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
  });

  test("image introuvable ou bloquée (adresse choisie par Claude) : retour à l'illustration de la catégorie", () => {
    const { container } = render(<RecipeArt image="https://exemple.fr/casse.jpg" titre="Tarte" categorie="dessert" />);
    fireEvent.error(screen.getByRole("img", { name: "Tarte" }));
    expect(screen.queryByRole("img", { name: "Tarte" })).not.toBeInTheDocument();
    expect(container.querySelector("[aria-hidden]")).toBeInTheDocument();
  });

  test("sans image : l'illustration directement", () => {
    const { container } = render(<RecipeArt titre="Tarte" categorie="dessert" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector("[aria-hidden]")).toBeInTheDocument();
  });

  test("une nouvelle adresse après une erreur est essayée à nouveau", () => {
    const { rerender } = render(<RecipeArt image="https://exemple.fr/casse.jpg" titre="Tarte" categorie="dessert" />);
    fireEvent.error(screen.getByRole("img", { name: "Tarte" }));
    rerender(<RecipeArt image="https://exemple.fr/bonne.jpg" titre="Tarte" categorie="dessert" />);
    expect(screen.getByRole("img", { name: "Tarte" })).toHaveAttribute("src", "https://exemple.fr/bonne.jpg");
  });
});

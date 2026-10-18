import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { uneRecette } from "@/lib/recipe/fixtures";
import type { Categorie } from "@/lib/recipe/types";
import { MemoryStore } from "@/lib/store/memory";
import type { RecipeRow } from "@/lib/store/types";
import { RecipeGrid } from "./RecipeGrid";

// l'ordre « récentes » est celui que donne le serveur : la plus récente d'abord
async function lignes(): Promise<RecipeRow[]> {
  const s = new MemoryStore();
  const ajouter = (titre: string, categorie: Categorie) =>
    s.insertRecipe({ status: "published", authorId: null, recipe: uneRecette({ titre, categorie }) });
  await ajouter("Hachis parmentier", "plat");
  await ajouter("Crème brûlée", "dessert");
  await ajouter("Salade niçoise", "salade");
  await ajouter("Brownie", "dessert");
  return s.listRecipes();
}

const titres = () =>
  screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);

afterEach(() => {
  vi.unstubAllGlobals();
  // @ts-expect-error nettoyage de la doublure
  delete document.startViewTransition;
  window.history.replaceState(null, "", "/");
});

describe("RecipeGrid : affichage, recherche, catégories, tri", () => {
  test("affiche toutes les recettes, la plus récente d'abord, et leur nombre", async () => {
    render(<RecipeGrid rows={await lignes()} />);
    expect(titres()).toEqual(["Brownie", "Salade niçoise", "Crème brûlée", "Hachis parmentier"]);
    expect(screen.getByRole("status")).toHaveTextContent("4 recettes");
  });

  test("chaque carte mène à la page de la recette", async () => {
    render(<RecipeGrid rows={await lignes()} />);
    expect(screen.getByRole("link", { name: /Brownie/ })).toHaveAttribute("href", "/recettes/brownie");
  });

  test("la recherche filtre en direct, sans accents ni majuscules", async () => {
    const user = userEvent.setup();
    render(<RecipeGrid rows={await lignes()} />);
    await user.type(screen.getByRole("searchbox", { name: "Chercher" }), "CREME");
    expect(titres()).toEqual(["Crème brûlée"]);
    expect(screen.getByRole("status")).toHaveTextContent("1 recette");
  });

  test("aucun résultat : message et possibilité de tout réafficher", async () => {
    const user = userEvent.setup();
    render(<RecipeGrid rows={await lignes()} />);
    await user.type(screen.getByRole("searchbox", { name: "Chercher" }), "zzzzz");
    expect(screen.getByText("Aucune recette ne correspond.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tout afficher" }));
    expect(titres()).toHaveLength(4);
  });

  test("une catégorie filtre ; « Toutes » remet tout", async () => {
    const user = userEvent.setup();
    render(<RecipeGrid rows={await lignes()} />);
    const nav = screen.getByRole("navigation", { name: "Catégories" });
    await user.click(within(nav).getByRole("button", { name: /Dessert/ }));
    expect(titres()).toEqual(["Brownie", "Crème brûlée"]);
    expect(within(nav).getByRole("button", { name: /Dessert/ })).toHaveAttribute("aria-pressed", "true");
    await user.click(within(nav).getByRole("button", { name: "Toutes" }));
    expect(titres()).toHaveLength(4);
  });

  test("tri A → Z puis retour à « plus récentes »", async () => {
    const user = userEvent.setup();
    render(<RecipeGrid rows={await lignes()} />);
    await user.selectOptions(screen.getByRole("combobox", { name: "Trier" }), "az");
    expect(titres()).toEqual(["Brownie", "Crème brûlée", "Hachis parmentier", "Salade niçoise"]);
    await user.selectOptions(screen.getByRole("combobox", { name: "Trier" }), "recentes");
    expect(titres()).toEqual(["Brownie", "Salade niçoise", "Crème brûlée", "Hachis parmentier"]);
  });

  test("le tri s'applique aussi aux résultats filtrés", async () => {
    const user = userEvent.setup();
    render(<RecipeGrid rows={await lignes()} />);
    const nav = screen.getByRole("navigation", { name: "Catégories" });
    await user.click(within(nav).getByRole("button", { name: /Dessert/ }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Trier" }), "az");
    expect(titres()).toEqual(["Brownie", "Crème brûlée"]);
  });

  test("valeurs de départ venues de l'adresse (/?q=…&categorie=…)", async () => {
    render(<RecipeGrid rows={await lignes()} qInitial="brown" categorieInitiale="dessert" />);
    expect(titres()).toEqual(["Brownie"]);
    expect(screen.getByRole("searchbox", { name: "Chercher" })).toHaveValue("brown");
  });

  test("l'adresse de la page suit les filtres, pour pouvoir la partager", async () => {
    const user = userEvent.setup();
    render(<RecipeGrid rows={await lignes()} />);
    const nav = screen.getByRole("navigation", { name: "Catégories" });
    await user.click(within(nav).getByRole("button", { name: /Dessert/ }));
    expect(window.location.search).toBe("?categorie=dessert");
    await user.type(screen.getByRole("searchbox", { name: "Chercher" }), "brow");
    expect(window.location.search).toBe("?q=brow&categorie=dessert");
    await user.click(within(nav).getByRole("button", { name: "Toutes" }));
    await user.clear(screen.getByRole("searchbox", { name: "Chercher" }));
    expect(window.location.search).toBe("");
  });
});

describe("RecipeGrid : animations", () => {
  let transition: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    transition = vi.fn((maj: () => void) => {
      maj();
      return { finished: Promise.resolve() };
    });
    (document as unknown as { startViewTransition: unknown }).startViewTransition = transition;
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false, addEventListener() {}, removeEventListener() {} }));
  });

  test("changer de catégorie ou de tri passe par une transition animée du navigateur", async () => {
    const user = userEvent.setup();
    render(<RecipeGrid rows={await lignes()} />);
    const nav = screen.getByRole("navigation", { name: "Catégories" });
    await user.click(within(nav).getByRole("button", { name: /Dessert/ }));
    expect(transition).toHaveBeenCalledTimes(1);
    await user.selectOptions(screen.getByRole("combobox", { name: "Trier" }), "az");
    expect(transition).toHaveBeenCalledTimes(2);
    expect(titres()).toEqual(["Brownie", "Crème brûlée"]);
  });

  test("taper dans la recherche ne lance pas une transition à chaque lettre", async () => {
    const user = userEvent.setup();
    render(<RecipeGrid rows={await lignes()} />);
    await user.type(screen.getByRole("searchbox", { name: "Chercher" }), "bro");
    expect(transition).not.toHaveBeenCalled();
    expect(titres()).toEqual(["Brownie"]);
  });

  test("chaque carte a un nom de transition à elle, pour que le navigateur la suive quand elle se déplace", async () => {
    render(<RecipeGrid rows={await lignes()} />);
    const noms = screen.getAllByRole("listitem").map((li) => (li as HTMLElement).style.viewTransitionName);
    expect(noms.every(Boolean)).toBe(true);
    expect(new Set(noms).size).toBe(noms.length);
  });

  test("transition annulée par le navigateur (onglet masqué, page qui change) : aucune erreur, la liste est quand même à jour", async () => {
    const annulee = () => Promise.reject(new DOMException("Transition was aborted because of invalid state", "InvalidStateError"));
    (document as unknown as { startViewTransition: unknown }).startViewTransition = (maj: () => void) => {
      maj();
      return { ready: annulee(), finished: annulee(), updateCallbackDone: annulee() };
    };
    const user = userEvent.setup();
    render(<RecipeGrid rows={await lignes()} />);
    await user.click(within(screen.getByRole("navigation", { name: "Catégories" })).getByRole("button", { name: /Dessert/ }));
    await new Promise((r) => setTimeout(r, 20)); // laisse passer d'éventuels rejets non gérés
    expect(titres()).toEqual(["Brownie", "Crème brûlée"]);
  });

  test("« réduire les animations » demandé par l'utilisateur : aucune transition", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true, addEventListener() {}, removeEventListener() {} }));
    const user = userEvent.setup();
    render(<RecipeGrid rows={await lignes()} />);
    await user.click(within(screen.getByRole("navigation", { name: "Catégories" })).getByRole("button", { name: /Dessert/ }));
    expect(transition).not.toHaveBeenCalled();
    expect(titres()).toEqual(["Brownie", "Crème brûlée"]);
  });

  test("navigateur sans transitions : ça marche quand même, sans animation", async () => {
    // @ts-expect-error doublure retirée
    delete document.startViewTransition;
    const user = userEvent.setup();
    render(<RecipeGrid rows={await lignes()} />);
    await user.click(within(screen.getByRole("navigation", { name: "Catégories" })).getByRole("button", { name: /Dessert/ }));
    await waitFor(() => expect(titres()).toEqual(["Brownie", "Crème brûlée"]));
  });
});

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { VariantPills, type Version } from "./VariantPills";

const versions: Version[] = [
  { slug: "lasagnes", titre: "Lasagnes", nomVariante: "La recette de Mamie", categorie: "plat", auteur: "Mamie", originale: true },
  {
    slug: "lasagnes-vege",
    titre: "Lasagnes végé",
    nomVariante: "Végétarienne",
    image: "https://img.test/vege.jpg",
    categorie: "plat",
    auteur: "Léa",
    originale: false,
  },
  { slug: "lasagnes-express", titre: "Lasagnes express", categorie: "plat", auteur: null, originale: false },
];

const pastilles = () => within(screen.getByRole("navigation", { name: "Versions de ce plat" }));

describe("VariantPills", () => {
  test("annonce le nombre de versions et les montre dans l'ordre, avec leur nom (ou leur titre)", () => {
    render(<VariantPills versions={versions} courante="lasagnes-vege" />);
    expect(screen.getByRole("button", { name: /3 versions de ce plat/ })).toBeInTheDocument();
    expect(screen.getByText("3 façons de faire ce plat")).toBeInTheDocument(); // ordinateur
    const noms = pastilles()
      .getAllByTestId("pastille-version")
      .map((p) => p.querySelector("[data-nom]")?.textContent);
    expect(noms).toEqual(["La recette de Mamie", "Végétarienne", "Lasagnes express"]);
  });

  test("« originale » sur la référence, le prénom de l'auteur sur les variantes", () => {
    render(<VariantPills versions={versions} courante="lasagnes-express" />);
    const [mamie, vege, express] = pastilles().getAllByTestId("pastille-version");
    expect(mamie).toHaveTextContent("Originale"); // téléphone
    expect(mamie).toHaveTextContent("· originale"); // ordinateur
    expect(mamie).not.toHaveTextContent("par Mamie");
    expect(mamie).not.toHaveTextContent("· Mamie");
    expect(vege).toHaveTextContent("par Léa");
    expect(vege).toHaveTextContent("· Léa");
    expect(express).not.toHaveTextContent("·");
  });

  test("sur téléphone, la version affichée est signalée « Tu la regardes »", () => {
    render(<VariantPills versions={versions} courante="lasagnes-vege" />);
    const [mamie, vege] = pastilles().getAllByTestId("pastille-version");
    expect(vege).toHaveTextContent("Tu la regardes");
    expect(mamie).not.toHaveTextContent("Tu la regardes");
  });

  test("la version affichée est marquée et n'est pas un lien ; les autres mènent à leur page", () => {
    render(<VariantPills versions={versions} courante="lasagnes-vege" />);
    const [mamie, vege] = pastilles().getAllByTestId("pastille-version");
    expect(vege).toHaveAttribute("aria-current", "true");
    expect(vege.tagName).not.toBe("A");
    expect(mamie).toHaveAttribute("href", "/recettes/lasagnes");
  });

  test("chaque pastille a une vignette : la photo, sinon l'emoji de la catégorie", () => {
    render(<VariantPills versions={versions} courante="lasagnes" />);
    const [mamie, vege] = pastilles().getAllByTestId("pastille-version");
    expect(vege.querySelector("img")).toHaveAttribute("src", "https://img.test/vege.jpg");
    expect(mamie.querySelector("img")).toBeNull();
    expect(mamie).toHaveTextContent("🍲");
  });

  test("sur téléphone, le menu est fermé au départ, s'ouvre et se referme", async () => {
    const user = userEvent.setup();
    render(<VariantPills versions={versions} courante="lasagnes" />);
    const bouton = screen.getByRole("button", { name: /3 versions de ce plat/ });
    const liste = screen.getByRole("navigation", { name: "Versions de ce plat" });
    expect(bouton).toHaveAttribute("aria-expanded", "false");
    expect(bouton).toHaveAttribute("aria-controls", liste.id);
    expect(bouton).toHaveTextContent("Voir");
    expect(liste).not.toHaveClass("ouvert");

    await user.click(bouton);
    expect(bouton).toHaveAttribute("aria-expanded", "true");
    expect(bouton).toHaveTextContent("Fermer");
    expect(liste).toHaveClass("ouvert");

    await user.click(bouton);
    expect(liste).not.toHaveClass("ouvert");
  });

  test("choisir une autre version referme le menu", async () => {
    const user = userEvent.setup();
    render(<VariantPills versions={versions} courante="lasagnes" />);
    await user.click(screen.getByRole("button", { name: /versions de ce plat/ }));
    const [, vege] = pastilles().getAllByTestId("pastille-version");
    vege.addEventListener("click", (e) => e.preventDefault()); // pas de vraie navigation dans jsdom
    await user.click(vege);
    expect(screen.getByRole("navigation", { name: "Versions de ce plat" })).not.toHaveClass("ouvert");
  });

  test("il n'y a plus de « ＋ » dans les versions : « Proposer une variante » est en bas de la page", () => {
    render(<VariantPills versions={versions} courante="lasagnes" />);
    expect(screen.queryByRole("button", { name: /Proposer une variante/ })).toBeNull();
  });

  test("une recette seule : rien n'est affiché", () => {
    const { container } = render(<VariantPills versions={versions.slice(0, 1)} courante="lasagnes" />);
    expect(container).toBeEmptyDOMElement();
  });
});

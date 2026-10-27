import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { VariantPills, type Version } from "./VariantPills";

afterEach(() => vi.restoreAllMocks());

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
    render(<VariantPills versions={versions} courante="lasagnes-vege" promptVariante="p" />);
    expect(screen.getByText("3 façons de faire ce plat")).toBeInTheDocument();
    const noms = pastilles()
      .getAllByTestId("pastille-version")
      .map((p) => p.querySelector("[data-nom]")?.textContent);
    expect(noms).toEqual(["La recette de Mamie", "Végétarienne", "Lasagnes express"]);
  });

  test("« originale » sur la référence, le prénom de l'auteur sur les variantes", () => {
    render(<VariantPills versions={versions} courante="lasagnes" promptVariante="p" />);
    const [mamie, vege, express] = pastilles().getAllByTestId("pastille-version");
    expect(mamie).toHaveTextContent("originale");
    expect(mamie).not.toHaveTextContent("Mamie ·");
    expect(vege).toHaveTextContent("Léa");
    expect(express).not.toHaveTextContent("·");
  });

  test("la version affichée est marquée et n'est pas un lien ; les autres mènent à leur page", () => {
    render(<VariantPills versions={versions} courante="lasagnes-vege" promptVariante="p" />);
    const [mamie, vege] = pastilles().getAllByTestId("pastille-version");
    expect(vege).toHaveAttribute("aria-current", "true");
    expect(vege.tagName).not.toBe("A");
    expect(mamie).toHaveAttribute("href", "/recettes/lasagnes");
  });

  test("chaque pastille a une vignette : la photo, sinon l'emoji de la catégorie", () => {
    render(<VariantPills versions={versions} courante="lasagnes" promptVariante="p" />);
    const [mamie, vege] = pastilles().getAllByTestId("pastille-version");
    expect(vege.querySelector("img")).toHaveAttribute("src", "https://img.test/vege.jpg");
    expect(mamie.querySelector("img")).toBeNull();
    expect(mamie).toHaveTextContent("🍲");
  });

  test("le « ＋ » copie le message pour proposer une variante", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    render(<VariantPills versions={versions} courante="lasagnes" promptVariante="Fais une variante" />);
    await user.click(screen.getByRole("button", { name: "Proposer une variante" }));
    expect(writeText).toHaveBeenCalledWith("Fais une variante");
  });

  test("une recette seule : rien n'est affiché", () => {
    const { container } = render(<VariantPills versions={versions.slice(0, 1)} courante="lasagnes" promptVariante="p" />);
    expect(container).toBeEmptyDOMElement();
  });
});

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { uneRecette } from "@/lib/recipe/fixtures";
import { platsAffiches, type PlatAffiche } from "@/lib/recipe/plats";
import { MemoryStore } from "@/lib/store/memory";
import { PlatCard } from "./PlatCard";

async function unPlat(nbVariantes: number): Promise<PlatAffiche> {
  const s = new MemoryStore();
  const a = await s.insertRecipe({ status: "published", authorId: null, recipe: uneRecette({ titre: "Lasagnes" }) });
  const noms = ["Végétarienne", "Express", "Sans gluten"];
  for (let i = 0; i < nbVariantes; i++) {
    await s.insertRecipe({
      status: "published",
      authorId: null,
      recipe: uneRecette({ titre: `Lasagnes ${i}`, nom_variante: noms[i], image: i === 0 ? "https://img.test/vege.jpg" : undefined }),
      varianteDe: a.id,
    });
  }
  return platsAffiches(await s.listRecipes(), "")[0];
}

const afficher = async (nbVariantes: number) => {
  const plat = await unPlat(nbVariantes);
  const rendu = render(
    <ul>
      <PlatCard plat={plat} index={0} />
    </ul>,
  );
  return { ...rendu, lien: screen.getByRole("link", { name: /Lasagnes/ }), pile: rendu.container.querySelector(".pile") };
};

describe("PlatCard : affichage", () => {
  test("avec 3 versions : 2 fiches derrière, leurs noms sur la tranche et sur la carte, « 3 versions »", async () => {
    const { container } = await afficher(2);
    const fiches = container.querySelectorAll(".feuille");
    expect(fiches).toHaveLength(2);
    expect(fiches[0]).toHaveClass("f1");
    expect(fiches[0]).toHaveAttribute("aria-hidden", "true");
    expect([...container.querySelectorAll(".tranche")].map((t) => t.textContent)).toEqual(["Végétarienne", "Express"]);
    expect(screen.getByText("3 versions")).toBeInTheDocument();
    const autres = within(screen.getByRole("list", { name: "Autres versions" }));
    expect(autres.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Végétarienne", "Express"]);
  });

  test("avec 4 versions : 2 noms sur la carte, puis « +1 »", async () => {
    await afficher(3);
    const autres = within(screen.getByRole("list", { name: "Autres versions" }));
    expect(autres.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Végétarienne", "Express", "+1"]);
  });

  test("avec 2 versions : une seule fiche, à gauche", async () => {
    const { container } = await afficher(1);
    const fiches = container.querySelectorAll(".feuille");
    expect(fiches).toHaveLength(1);
    expect(fiches[0]).toHaveClass("f1");
    expect(screen.getByText("2 versions")).toBeInTheDocument();
  });

  test("une recette seule : la carte de toujours, sans pile ni versions", async () => {
    const { container, lien, pile } = await afficher(0);
    expect(pile).toBeNull();
    expect(container.querySelector(".feuille")).toBeNull();
    expect(screen.queryByText(/versions/)).toBeNull();
    expect(screen.queryByRole("list", { name: "Autres versions" })).toBeNull();
    expect(lien).toHaveAttribute("href", "/recettes/lasagnes");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Lasagnes");
  });
});

describe("PlatCard : sur téléphone", () => {
  test("pas d'appui long : un appui ouvre la recette, et le menu du navigateur n'est pas bloqué", async () => {
    const { lien, pile } = await afficher(2);
    fireEvent.touchStart(lien, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchEnd(lien);
    expect(pile).not.toHaveClass("ouvert");
    expect(fireEvent.click(lien)).toBe(true);
    expect(fireEvent.contextMenu(lien)).toBe(true);
  });
});

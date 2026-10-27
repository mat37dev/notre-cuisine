import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
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

const toucher = (el: Element, x = 100, y = 100) => fireEvent.touchStart(el, { touches: [{ clientX: x, clientY: y }] });

describe("PlatCard : affichage", () => {
  test("avec 3 versions : 2 fiches derrière, leurs noms sur la tranche, « 3 versions » et 2 vignettes", async () => {
    const { container } = await afficher(2);
    const fiches = container.querySelectorAll(".feuille");
    expect(fiches).toHaveLength(2);
    expect(fiches[0]).toHaveClass("f1");
    expect(fiches[0]).toHaveAttribute("aria-hidden", "true");
    expect([...container.querySelectorAll(".tranche")].map((t) => t.textContent)).toEqual(["Végétarienne", "Express"]);
    expect(screen.getByText("3 versions")).toBeInTheDocument();
    expect(container.querySelectorAll("[data-vignette]")).toHaveLength(2);
    expect(screen.getByText("Autres versions : Végétarienne, Express")).toBeInTheDocument();
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
    expect(lien).toHaveAttribute("href", "/recettes/lasagnes");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Lasagnes");
  });
});

describe("PlatCard : appui long sur téléphone", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", { ...navigator, vibrate: vi.fn() });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test("400 ms de doigt immobile : l'éventail s'ouvre avec une petite vibration, il se referme en lâchant", async () => {
    const { lien, pile } = await afficher(2);
    toucher(lien);
    act(() => void vi.advanceTimersByTime(399));
    expect(pile).not.toHaveClass("ouvert");
    act(() => void vi.advanceTimersByTime(1));
    expect(pile).toHaveClass("ouvert");
    expect(navigator.vibrate).toHaveBeenCalledWith(10);
    fireEvent.touchEnd(lien);
    expect(pile).not.toHaveClass("ouvert");
    // le « clic » qui suit le relâchement n'ouvre pas la recette
    expect(fireEvent.click(lien)).toBe(false);
    // le suivant, si : c'est un vrai clic
    expect(fireEvent.click(lien)).toBe(true);
  });

  test("le doigt bouge (défilement) : l'éventail ne s'ouvre pas et le clic suivant n'est pas bloqué", async () => {
    const { lien, pile } = await afficher(2);
    toucher(lien);
    fireEvent.touchMove(lien, { touches: [{ clientX: 100, clientY: 115 }] });
    act(() => void vi.advanceTimersByTime(500));
    expect(pile).not.toHaveClass("ouvert");
    fireEvent.touchEnd(lien);
    expect(fireEvent.click(lien)).toBe(true);
  });

  test("un appui court ouvre la recette comme avant", async () => {
    const { lien, pile } = await afficher(2);
    toucher(lien);
    act(() => void vi.advanceTimersByTime(100));
    fireEvent.touchEnd(lien);
    expect(pile).not.toHaveClass("ouvert");
    expect(fireEvent.click(lien)).toBe(true);
  });

  test("le menu du navigateur est bloqué sur une pile, pas sur une carte seule", async () => {
    const pile = await afficher(2);
    expect(fireEvent.contextMenu(pile.lien)).toBe(false);
    pile.unmount();
    const seule = await afficher(0);
    expect(fireEvent.contextMenu(seule.lien)).toBe(true);
  });
});

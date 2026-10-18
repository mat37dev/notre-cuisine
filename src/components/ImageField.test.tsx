import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ImageField } from "./ImageField";

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
const reduite = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: "image/jpeg" });
const resize = vi.fn().mockResolvedValue(reduite);
const photo = () => new File([new Uint8Array(10)], "ma-salade.png", { type: "image/png" });

describe("ImageField", () => {
  test("sans photo : propose d'en choisir une, rien à retirer", () => {
    render(<ImageField recipeId="r1" titre="Salade" resize={resize} />);
    expect(screen.getByLabelText("Choisir une photo")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retirer la photo" })).not.toBeInTheDocument();
  });

  test("avec photo : l'affiche et propose de la retirer", () => {
    render(<ImageField recipeId="r1" titre="Salade" image="https://exemple.test/a.jpg" resize={resize} />);
    expect(screen.getByRole("img", { name: "Photo de Salade" })).toHaveAttribute("src", "https://exemple.test/a.jpg");
    expect(screen.getByRole("button", { name: "Retirer la photo" })).toBeInTheDocument();
  });

  test("choisir une photo : réduite puis envoyée, la nouvelle image s'affiche", async () => {
    fetchMock.mockReturnValue(reponse(200, { image: "https://exemple.test/nouvelle.jpg" }));
    const user = userEvent.setup();
    render(<ImageField recipeId="r1" titre="Salade" resize={resize} />);
    await user.upload(screen.getByLabelText("Choisir une photo"), photo());
    await waitFor(() =>
      expect(screen.getByRole("img", { name: "Photo de Salade" })).toHaveAttribute(
        "src",
        "https://exemple.test/nouvelle.jpg",
      ),
    );
    expect(resize).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/recettes/r1/image");
    expect(init.method).toBe("POST");
    expect((init.body as FormData).get("image")).toBeInstanceOf(Blob);
    expect(refresh).toHaveBeenCalled();
  });

  test("retirer la photo : appelle DELETE puis n'affiche plus d'image", async () => {
    fetchMock.mockReturnValue(reponse(200, { ok: true }));
    const user = userEvent.setup();
    render(<ImageField recipeId="r1" titre="Salade" image="https://exemple.test/a.jpg" resize={resize} />);
    await user.click(screen.getByRole("button", { name: "Retirer la photo" }));
    await waitFor(() => expect(screen.queryByRole("img", { name: "Photo de Salade" })).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith("/api/recettes/r1/image", { method: "DELETE" });
  });

  test("le serveur refuse : message affiché, l'ancienne photo reste", async () => {
    fetchMock.mockReturnValue(reponse(415, { erreur: "Ce fichier n'est pas une image JPEG, PNG ou WebP." }));
    const user = userEvent.setup();
    render(<ImageField recipeId="r1" titre="Salade" image="https://exemple.test/a.jpg" resize={resize} />);
    await user.upload(screen.getByLabelText("Choisir une photo"), photo());
    expect(await screen.findByRole("alert")).toHaveTextContent("Ce fichier n'est pas une image");
    expect(screen.getByRole("img", { name: "Photo de Salade" })).toHaveAttribute("src", "https://exemple.test/a.jpg");
  });

  test("si la réduction de l'image échoue : message clair, rien n'est envoyé", async () => {
    const echec = vi.fn().mockRejectedValue(new Error("illisible"));
    const user = userEvent.setup();
    render(<ImageField recipeId="r1" titre="Salade" resize={echec} />);
    await user.upload(screen.getByLabelText("Choisir une photo"), photo());
    expect(await screen.findByRole("alert")).toHaveTextContent("Impossible de lire cette image");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

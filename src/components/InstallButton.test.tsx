import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { creerBoutiqueInstallation } from "@/lib/install-prompt";
import { InstallButton } from "./InstallButton";

// une boutique neuve par test : l'état « installable » ne doit pas fuir d'un test à l'autre
const rendre = (variante?: "entete") =>
  render(<InstallButton variante={variante} boutique={creerBoutiqueInstallation()} />);

type EvenementInstallation = Event & { prompt: ReturnType<typeof vi.fn>; userChoice: Promise<{ outcome: string }> };

function evenement(outcome: "accepted" | "dismissed" = "accepted"): EvenementInstallation {
  return Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome }),
  });
}
const proposer = (e: Event) => act(() => void window.dispatchEvent(e));

function faireSemblantDeLAppliInstallee(installee: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((q: string) => ({
      matches: installee && q.includes("standalone"),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("InstallButton (carte, dans Mon compte et Admin)", () => {
  test("avant que le navigateur propose l'installation : explique comment faire à la main", () => {
    faireSemblantDeLAppliInstallee(false);
    rendre();
    expect(screen.queryByRole("button", { name: "Installer l'appli" })).not.toBeInTheDocument();
    expect(screen.getByText(/Installer l'application/)).toBeInTheDocument();
    expect(screen.getByText(/Sur l'écran d'accueil/)).toBeInTheDocument();
  });

  test("dès que le navigateur propose l'installation : le bouton apparaît, et la bannière automatique est évitée", async () => {
    faireSemblantDeLAppliInstallee(false);
    rendre();
    const e = evenement();
    proposer(e);
    expect(await screen.findByRole("button", { name: "Installer l'appli" })).toBeInTheDocument();
    expect(e.defaultPrevented).toBe(true);
  });

  test("un clic ouvre la fenêtre d'installation du navigateur, puis confirme l'installation", async () => {
    faireSemblantDeLAppliInstallee(false);
    const user = userEvent.setup();
    rendre();
    const e = evenement("accepted");
    proposer(e);
    await user.click(await screen.findByRole("button", { name: "Installer l'appli" }));
    expect(e.prompt).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("status")).toHaveTextContent("installée");
    expect(screen.queryByRole("button", { name: "Installer l'appli" })).not.toBeInTheDocument();
  });

  test("si on refuse : le bouton disparaît (le navigateur ne le permet qu'une fois) et l'explication revient", async () => {
    faireSemblantDeLAppliInstallee(false);
    const user = userEvent.setup();
    rendre();
    proposer(evenement("dismissed"));
    await user.click(await screen.findByRole("button", { name: "Installer l'appli" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Installer l'appli" })).not.toBeInTheDocument());
    expect(screen.getByText(/Installer l'application/)).toBeInTheDocument();
  });

  test("appli déjà ouverte en mode installé : le dit, sans bouton", () => {
    faireSemblantDeLAppliInstallee(true);
    rendre();
    expect(screen.getByRole("status")).toHaveTextContent("installée");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  test("événement « appinstalled » (installée depuis le menu du navigateur) : bascule sur le message", async () => {
    faireSemblantDeLAppliInstallee(false);
    rendre();
    act(() => void window.dispatchEvent(new Event("appinstalled")));
    expect(await screen.findByRole("status")).toHaveTextContent("installée");
  });
});

describe("InstallButton (variante en-tête)", () => {
  test("invisible tant que l'installation n'est pas possible", () => {
    faireSemblantDeLAppliInstallee(false);
    const { container } = rendre("entete");
    expect(container).toBeEmptyDOMElement();
  });

  test("un petit bouton apparaît quand le navigateur propose l'installation", async () => {
    faireSemblantDeLAppliInstallee(false);
    rendre("entete");
    proposer(evenement());
    expect(await screen.findByRole("button", { name: "Installer l'appli" })).toBeInTheDocument();
  });

  test("invisible quand l'appli est déjà installée", () => {
    faireSemblantDeLAppliInstallee(true);
    const { container } = rendre("entete");
    expect(container).toBeEmptyDOMElement();
  });
});

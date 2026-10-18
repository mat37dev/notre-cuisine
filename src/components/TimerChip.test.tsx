import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { TimerChip } from "./TimerChip";

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe("TimerChip", () => {
  test("démarre au clic, décompte, puis annonce que c'est terminé", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TimerChip secondes={3} />);
    await user.click(screen.getByRole("button", { name: /00:03/ }));
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole("button", { name: /00:02/ })).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Terminé");
  });

  test("pause puis reprise gardent le temps restant", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<TimerChip secondes={60} />);
    await user.click(screen.getByRole("button", { name: /01:00/ }));
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
    await user.click(screen.getByRole("button", { name: /00:50/ })); // pause
    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });
    expect(screen.getByRole("button", { name: /00:50/ })).toBeInTheDocument();
  });
});

import { describe, expect, test } from "vitest";
import { clockIntentUrl, formatClock, remainingMs } from "./timer";

describe("formatClock", () => {
  test.each([
    [150_000, "02:30"],
    [3_900_000, "1:05:00"],
    [0, "00:00"],
    [1, "00:01"],
    [59_999, "01:00"],
    [-5000, "00:00"],
  ])("%s ms s'affiche « %s »", (ms, attendu) => {
    expect(formatClock(ms)).toBe(attendu);
  });
});

describe("remainingMs", () => {
  test("temps restant, jamais négatif", () => {
    expect(remainingMs(10_000, 4_000)).toBe(6_000);
    expect(remainingMs(1_000, 5_000)).toBe(0);
  });
});

describe("clockIntentUrl", () => {
  test("lien Android qui demande à l'appli Horloge de lancer un minuteur", () => {
    expect(clockIntentUrl(150)).toBe(
      "intent:#Intent;action=android.intent.action.SET_TIMER;i.android.intent.extra.alarm.LENGTH=150;B.android.intent.extra.alarm.SKIP_UI=true;end",
    );
  });
});

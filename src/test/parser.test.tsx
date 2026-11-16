import { describe, expect, test } from "vitest";
import { loadAdvancement, loadRequirements, parseAdvancement } from "../parser";

describe("loadRequirements", () => {
  interface DenTestCase {
    den: string;
    numberOfAdventures: number;
  }
  test.for([
    { den: "Lion", numberOfAdventures: 20 },
    { den: "Tiger", numberOfAdventures: 6 },
    { den: "Wolf", numberOfAdventures: 6 },
    { den: "Bear", numberOfAdventures: 26 },
    { den: "Webelos", numberOfAdventures: 26 },
    { den: "Arrow of Light", numberOfAdventures: 6 },
  ])(
    "The $den Den has $numberOfAdventures adventures",
    (testCase: DenTestCase) => {
      const requirements = loadRequirements();
      const denRequirements = requirements[testCase.den] || [];
      expect(Object.keys(denRequirements).length).toBe(
        testCase.numberOfAdventures,
      );
    },
  );
});

describe("loadAdvancement", () => {
  test("loads example advancements", async () => {
    const { default: csv } = await import("./fixtures/example-report.csv?raw");

    const result = await loadAdvancement(csv);
    expect(result.length).toBe(809);
  });

  test("rejects when the CSV is empty", async () => {
    await expect(loadAdvancement("")).rejects.toThrow(
      "The CSV file is too short or empty.",
    );
  });
});

describe("parseAdvancement", async () => {
  test("something", async () => {
    const { default: csv } = await import("./fixtures/example-report.csv?raw");
    const rows = await loadAdvancement(csv);
    const scouts = await parseAdvancement(rows);
    const oli = scouts[3];
    expect(oli.finishedAdventures.length).toBe(2);
    console.log(oli.pendingIncompleteRequirements);
  });
});

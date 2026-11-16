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

    const wolf = scouts[0];
    expect(wolf.name).toBe("Alice Wolf");

    expect(wolf.inProgressAdventures.length).toBe(2);
    expect(wolf.inProgressAdventures[0].name).toBe("Running With the Pack");
    expect(Object.keys(wolf.inProgressAdventures[0].requirements).length).toBe(
      6,
    );
    expect(wolf.availableAdventures.length).toBe(0); // TODO: Change once we set all the reqs up
    expect(wolf.completedAdventures.length).toBe(4);

    const webelo = scouts[3];
    expect(webelo.name).toBe("Dina Webelo");
    expect(webelo.inProgressAdventures.length).toBe(7);
    expect(webelo.inProgressAdventures[0].name).toBe("Bobcat (Webelos)");
    expect(
      Object.keys(webelo.inProgressAdventures[0].requirements).length,
    ).toBe(1);
    expect(webelo.availableAdventures.length).toBe(17);
    expect(webelo.completedAdventures.length).toBe(2);
  });
});

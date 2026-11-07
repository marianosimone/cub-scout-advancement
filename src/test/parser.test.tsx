import { expect, test } from "vitest";
import { loadRequirements } from "../parser";

test.for([
  ["Lion", 20],
  ["Tiger", 6],
  ["Wolf", 6],
  ["Bear", 26],
  ["Webelos", 26],
  ["Arrow of Light", 6],
])("The %s Den has %i adventures", ([den, expectedAdventures]) => {
  const requirements = loadRequirements();
  expect(Object.keys(requirements[den]).length).toBe(expectedAdventures);
});

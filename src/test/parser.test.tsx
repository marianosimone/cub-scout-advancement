import { expect, test } from 'vitest'
import {  loadRequirements } from '../parser'

test('loads the requirements', () => {
  const requirements = loadRequirements();
  expect(requirements.keys()).toContain("hello");
});

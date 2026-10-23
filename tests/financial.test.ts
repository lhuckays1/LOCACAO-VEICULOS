import test from 'node:test';
import assert from 'node:assert/strict';
import { money, validDate } from '../backend/src/services/financial.js';
test('financial dates reject impossible calendar dates', () => {
  assert.throws(() => validDate('2026-02-30'));
  assert.throws(() => validDate('not-a-date'));
  assert.equal(validDate('2028-02-29').toISOString(), '2028-02-29T00:00:00.000Z');
});
test('money arithmetic keeps cent precision', () => {
  assert.equal(money('0.10').plus(money('0.20')).toString(), '0.3');
});

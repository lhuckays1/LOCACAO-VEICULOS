import test from 'node:test';
import assert from 'node:assert/strict';
import { cashFlow } from '../backend/src/services/cashflow.js';
test('cash flow assigns partial payments to their payment dates and the remainder to the due date', () => {
  const result = cashFlow([{ type: 'INCOME', status: 'PARTIAL', paidAmount: 60, remainingAmount: 40,
    dueDate: '2026-02-10', settlementDate: null, settlements: [
      { paymentDate: new Date('2026-01-31'), amount: 20 }, { paymentDate: new Date('2026-02-05'), amount: 40 },
    ] }], '2026-02-01', '2026-02-28');
  assert.equal(result.openingBalance, 20);
  assert.equal(result.days.find(d => d.date === '2026-02-05')?.inflowRealized, 40);
  assert.equal(result.days.find(d => d.date === '2026-02-10')?.inflowProjected, 40);
  assert.equal(result.finalBalanceRealized, 60);
  assert.equal(result.finalBalanceProjected, 100);
});
test('cash flow rejects inverted or unbounded periods', () => {
  assert.throws(() => cashFlow([], '2026-02-02', '2026-02-01'));
  assert.throws(() => cashFlow([], '2000-01-01', '2026-02-01'));
});

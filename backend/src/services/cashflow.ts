import { validDate, dateOnly, money } from './financial.js';
import { HttpError } from '../utils/api-error.js';

interface CashFlowTransaction {
  type: string; paidAmount: number; remainingAmount: number; status: string;
  dueDate: string; settlementDate: string | null;
  settlements: { paymentDate: Date; amount: number }[];
}

export function cashFlow(transactions: CashFlowTransaction[], start: string, end: string) {
  const first = validDate(start), last = validDate(end);
  if (first > last || last.getTime() - first.getTime() > 732 * 86400000)
    throw new HttpError(400, 'Selecione um período de até dois anos, com início anterior ao fim.');
  const days = new Map<string, { date: string; inflowRealized: number; inflowProjected: number; outflowRealized: number; outflowProjected: number; items: CashFlowTransaction[] }>();
  for (let time = first.getTime(); time <= last.getTime(); time += 86400000) {
    const date = dateOnly(new Date(time));
    days.set(date, { date, inflowRealized: 0, inflowProjected: 0, outflowRealized: 0, outflowProjected: 0, items: [] });
  }
  let openingBalance = money(0);
  for (const tx of transactions.filter(t => t.status !== 'CANCELLED')) {
    const income = tx.type === 'INCOME';
    const payments = tx.settlements.length ? tx.settlements : tx.paidAmount > 0
      ? [{ paymentDate: validDate(tx.settlementDate || tx.dueDate), amount: tx.paidAmount }] : [];
    for (const payment of payments) {
      const date = dateOnly(payment.paymentDate);
      if (date < start) openingBalance = openingBalance.plus(income ? payment.amount : -payment.amount);
      const day = days.get(date);
      if (day) { day[income ? 'inflowRealized' : 'outflowRealized'] += payment.amount; if (!day.items.includes(tx)) day.items.push(tx); }
    }
    const projected = days.get(tx.dueDate);
    if (projected && tx.remainingAmount > 0) {
      projected[income ? 'inflowProjected' : 'outflowProjected'] += tx.remainingAmount;
      if (!projected.items.includes(tx)) projected.items.push(tx);
    }
  }
  const round = (value: number) => Number(money(value));
  let balanceRealized = Number(openingBalance), balanceProjected = Number(openingBalance);
  const result = [...days.values()].map(day => {
    const netRealized = round(day.inflowRealized - day.outflowRealized);
    const netProjected = round(netRealized + day.inflowProjected - day.outflowProjected);
    balanceRealized = round(balanceRealized + netRealized); balanceProjected = round(balanceProjected + netProjected);
    return { ...day, inflowRealized: round(day.inflowRealized), outflowRealized: round(day.outflowRealized),
      inflowProjected: round(day.inflowProjected), outflowProjected: round(day.outflowProjected),
      itemsCount: day.items.length, netRealized, netProjected, balanceRealized, balanceProjected };
  });
  const total = (field: 'inflowRealized' | 'inflowProjected' | 'outflowRealized' | 'outflowProjected') => round(result.reduce((sum, d) => sum + d[field], 0));
  return { period: { start, end }, openingBalance: Number(openingBalance), days: result,
    totalInflowRealized: total('inflowRealized'), totalInflowProjected: total('inflowProjected'),
    totalOutflowRealized: total('outflowRealized'), totalOutflowProjected: total('outflowProjected'),
    finalBalanceRealized: balanceRealized, finalBalanceProjected: balanceProjected };
}

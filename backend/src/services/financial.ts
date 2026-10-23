import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { HttpError } from '../utils/api-error.js';
import { z } from 'zod';
import { createFinancialTransactionSchema, settleTransactionSchema } from '../schemas/financial.schema.js';

export const financialRelations = { client: true, vehicle: true, category: true, costCenter: true, rental: true, settlements: true } as const;
export type FinancialRecord = Prisma.FinancialTransactionGetPayload<{ include: typeof financialRelations }>;

export const money = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value).toDecimalPlaces(2);
export const dateOnly = (value: Date | string) => new Date(value).toISOString().slice(0, 10);
export function validDate(value: string): Date {
  const text = value.slice(0, 10);
  const date = new Date(`${text}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || !Number.isFinite(date.getTime()) || dateOnly(date) !== text)
    throw new HttpError(400, 'Data inválida.');
  return date;
}

export function serializeFinancial(tx: FinancialRecord) {
  const daysOverdue = !['PAID', 'CANCELLED'].includes(tx.status)
    ? Math.max(0, Math.floor((validDate(dateOnly(new Date())).getTime() - validDate(dateOnly(tx.dueDate)).getTime()) / 86400000)) : 0;
  return {
    ...tx, tenantId: tx.companyId,
    grossAmount: Number(tx.grossAmount), discountAmount: Number(tx.discountAmount), interestAmount: Number(tx.interestAmount),
    netAmount: Number(tx.netAmount), paidAmount: Number(tx.paidAmount), remainingAmount: Number(tx.remainingAmount),
    dueDate: dateOnly(tx.dueDate), competencyDate: dateOnly(tx.competencyDate), settlementDate: tx.settlementDate ? dateOnly(tx.settlementDate) : null,
    status: daysOverdue && tx.status === 'PENDING' ? 'OVERDUE' as const : tx.status,
    clientName: tx.client?.name ?? null, clientDocument: tx.client?.cpfCnpj ?? null, clientPhone: tx.client?.phone ?? null,
    vehiclePlate: tx.vehicle?.plate ?? null, vehicleModel: tx.vehicle ? `${tx.vehicle.brand} ${tx.vehicle.model}` : null,
    categoryName: tx.category?.name ?? 'SEM CATEGORIA', categoryColor: tx.category?.color ?? '#64748B',
    costCenterName: tx.costCenter?.name ?? 'GERAL', costCenterCode: tx.costCenter?.code ?? '000',
    contractNumber: tx.rental?.codigoContrato ?? tx.rental?.rentalNumber ?? null,
    daysOverdue,
    settlements: tx.settlements.map(s => ({ ...s, amount: Number(s.amount), interest: Number(s.interest), fine: Number(s.fine), discount: Number(s.discount) })),
  };
}

export async function tenantTransactions(companyId: string, where: Prisma.FinancialTransactionWhereInput = {}) {
  return (await prisma.financialTransaction.findMany({ where: { AND: [{ companyId }, where] }, include: financialRelations })).map(serializeFinancial);
}

export async function validateFinancialLinks(tx: Prisma.TransactionClient, companyId: string, data: z.infer<typeof createFinancialTransactionSchema>) {
  const links = [
    [data.categoryId, () => tx.financialCategory.findFirst({ where: { id: data.categoryId!, companyId, active: true, type: data.type } })],
    [data.costCenterId, () => tx.costCenter.findFirst({ where: { id: data.costCenterId!, companyId, active: true } })],
    [data.clientId, () => tx.client.findFirst({ where: { id: data.clientId!, companyId } })],
    [data.vehicleId, () => tx.vehicle.findFirst({ where: { id: data.vehicleId!, companyId } })],
    [data.rentalId, () => tx.rental.findFirst({ where: { id: data.rentalId!, companyId } })],
  ] as const;
  for (const [id, query] of links) if (id && !await query()) throw new HttpError(400, 'Vínculo inválido ou pertencente a outra empresa.');
  if (data.rentalPaymentId) throw new HttpError(400, 'Parcelas devem ser geradas pelo contrato de locação.');
}

export async function settleFinancial(id: string, companyId: string, userId: string, data: z.infer<typeof settleTransactionSchema>) {
  const paymentDate = validDate(data.paymentDate);
  return prisma.$transaction(async tx => {
    // Row lock also serializes payments made through the rental endpoint.
    await tx.$queryRaw`SELECT id FROM financial_transactions WHERE id = ${id} AND "companyId" = ${companyId} FOR UPDATE`;
    const current = await tx.financialTransaction.findFirst({ where: { id, companyId } });
    if (!current) throw new HttpError(404, 'Lançamento não encontrado.');
    if (['CANCELLED', 'PAID'].includes(current.status)) throw new HttpError(409, 'Lançamento cancelado ou já liquidado.');
    const interest = money(data.interest ?? 0), fine = money(data.fine ?? 0), discount = money(data.discount ?? 0), amount = money(data.amount);
    const netAmount = current.netAmount.plus(interest).plus(fine).minus(discount);
    const paidAmount = current.paidAmount.plus(amount);
    if (amount.lte(0) || netAmount.lt(paidAmount)) throw new HttpError(400, 'Pagamento excede o saldo ou desconto inválido.');
    const remainingAmount = netAmount.minus(paidAmount);
    const status = remainingAmount.isZero() ? 'PAID' : 'PARTIAL';
    const settlement = await tx.financialSettlement.create({ data: {
      companyId, transactionId: id, userId, amount, interest, fine, discount, paymentDate,
      paymentMethod: data.paymentMethod, notes: data.notes, receiptUrl: data.receiptUrl,
    } });
    const updated = await tx.financialTransaction.update({ where: { id }, data: {
      netAmount, paidAmount, remainingAmount, status,
      interestAmount: current.interestAmount.plus(interest).plus(fine), discountAmount: current.discountAmount.plus(discount),
      settlementDate: status === 'PAID' ? paymentDate : null, paymentMethod: data.paymentMethod,
    }, include: financialRelations });
    if (current.rentalPaymentId) await tx.rentalPayment.updateMany({
      where: { id: current.rentalPaymentId, tenantId: companyId },
      data: { status: status === 'PAID' ? 'PAGO' : 'PARCIAL', dataPagamento: status === 'PAID' ? dateOnly(paymentDate) : null, formaPagamento: data.paymentMethod },
    });
    await tx.auditLog.create({ data: { companyId, userId, action: 'SETTLEMENT', entity: 'FINANCIAL_TRANSACTION', entityId: id,
      newData: JSON.stringify({ amount: Number(amount), status }) } });
    return { transaction: serializeFinancial(updated), settlement: { ...settlement, amount: Number(amount), interest: Number(interest), fine: Number(fine), discount: Number(discount) } };
  });
}

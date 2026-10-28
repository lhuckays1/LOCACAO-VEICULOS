import { NextFunction, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { HttpError } from '../utils/api-error.js';
import { money, validDate } from '../services/financial.js';

const policySchema = z.object({
  vehicleId: z.string().min(1), insurer: z.string().trim().min(2), insurerId: z.string().optional().nullable(), policyNumber: z.string().trim().min(2),
  coverageType: z.string().trim().min(2), totalPremium: z.coerce.number().positive(), installmentCount: z.coerce.number().int().min(1).max(24),
  startDate: z.string().min(10), endDate: z.string().min(10), firstDueDate: z.string().min(10),
  categoryId: z.string().optional().nullable(), notes: z.string().optional().nullable(),
}).refine(value => new Date(value.startDate) <= new Date(value.endDate), { message: 'A vigência final deve ser posterior à inicial.', path: ['endDate'] });

function addMonth(date: Date, offset: number) {
  const day = date.getUTCDate();
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export class VehicleInsuranceController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await prisma.vehicleInsurance.findMany({
        where: { companyId: req.user!.companyId!, ...(req.query.vehicleId ? { vehicleId: String(req.query.vehicleId) } : {}), ...(req.query.status && req.query.status !== 'ALL' ? { status: String(req.query.status) } : {}) },
        include: { vehicle: { select: { id: true, plate: true, brand: true, model: true } }, financialTransactions: { select: { id: true, description: true, grossAmount: true, netAmount: true, paidAmount: true, remainingAmount: true, dueDate: true, status: true, installmentNumber: true, totalInstallments: true }, orderBy: { installmentNumber: 'asc' } } },
        orderBy: { endDate: 'asc' },
      });
      res.json({ total: data.length, data: data.map(item => ({ ...item, totalPremium: Number(item.totalPremium), financialTransactions: item.financialTransactions.map(tx => ({ ...tx, grossAmount: Number(tx.grossAmount), netAmount: Number(tx.netAmount), paidAmount: Number(tx.paidAmount), remainingAmount: Number(tx.remainingAmount) })) })) });
    } catch (error) { next(error); }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId!;
      const data = policySchema.parse(req.body);
      const vehicle = await prisma.vehicle.findFirst({ where: { id: data.vehicleId, companyId } });
      if (!vehicle) throw new HttpError(400, 'Veículo inválido para esta empresa.');
      let insurerName = data.insurer;
      if (data.insurerId) {
        const insurer = await prisma.supplier.findFirst({ where: { id: data.insurerId, companyId, ativo: true } });
        if (!insurer) throw new HttpError(400, 'Selecione uma seguradora ativa e válida.');
        insurerName = insurer.nome;
      }
      if (data.categoryId) {
        const category = await prisma.financialCategory.findFirst({ where: { id: data.categoryId, companyId, type: 'EXPENSE', active: true } });
        if (!category) throw new HttpError(400, 'Selecione uma categoria de despesa ativa.');
      }
      const premiumCents = Math.round(data.totalPremium * 100);
      const baseCents = Math.floor(premiumCents / data.installmentCount);
      const dates = [data.startDate, data.endDate, data.firstDueDate].map(value => validDate(value));
      const policy = await prisma.$transaction(async tx => {
        const record = await tx.vehicleInsurance.create({ data: {
          companyId, vehicleId: vehicle.id, insurer: insurerName.toUpperCase(), policyNumber: data.policyNumber,
          coverageType: data.coverageType.toUpperCase(), totalPremium: money(data.totalPremium), installmentCount: data.installmentCount,
          startDate: dates[0], endDate: dates[1], firstDueDate: dates[2], notes: data.notes || null,
        } });
        await tx.vehicle.update({ where: { id: vehicle.id }, data: { insuranceProvider: record.insurer, insuranceExpiration: record.endDate } });
        for (let index = 0; index < data.installmentCount; index++) {
          const cents = index === data.installmentCount - 1 ? premiumCents - baseCents * index : baseCents;
          const installmentAmount = money(cents / 100);
          const dueDate = addMonth(dates[2], index);
          await tx.financialTransaction.create({ data: {
            companyId, type: 'EXPENSE', origin: 'INSURANCE', description: `SEGURO ${record.insurer} · ${vehicle.plate} · ${record.policyNumber} · ${index + 1}/${data.installmentCount}`,
            categoryId: data.categoryId || null, vehicleId: vehicle.id, insuranceId: record.id,
            grossAmount: installmentAmount, netAmount: installmentAmount, remainingAmount: installmentAmount,
            dueDate, competencyDate: dueDate, status: dueDate < validDate(new Date().toISOString()) ? 'OVERDUE' : 'PENDING',
            installmentNumber: index + 1, totalInstallments: data.installmentCount, notes: data.notes || null,
          } });
        }
        await tx.auditLog.create({ data: { companyId, userId: req.user!.userId, action: 'CREATE', entity: 'VEHICLE_INSURANCE', entityId: record.id } });
        return tx.vehicleInsurance.findUniqueOrThrow({ where: { id: record.id }, include: { vehicle: true, financialTransactions: { orderBy: { installmentNumber: 'asc' } } } });
      });
      res.status(201).json({ message: 'Apólice cadastrada e parcelas incluídas nas contas a pagar.', data: policy });
    } catch (error) { next(error); }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId!;
      const status = z.enum(['ACTIVE', 'CANCELLED']).parse(req.body.status);
      const record = await prisma.vehicleInsurance.findFirst({ where: { id: req.params.id, companyId } });
      if (!record) throw new HttpError(404, 'Apólice não encontrada.');
      const updated = await prisma.$transaction(async tx => {
        const policy = await tx.vehicleInsurance.update({ where: { id: record.id }, data: { status } });
        if (status === 'CANCELLED') await tx.financialTransaction.updateMany({ where: { companyId, insuranceId: record.id, status: { in: ['PENDING', 'OVERDUE'] }, paidAmount: 0 }, data: { status: 'CANCELLED', notes: [record.notes, 'PARCELA CANCELADA JUNTO À APÓLICE'].filter(Boolean).join(' | ') } });
        const currentPolicy = status === 'ACTIVE' ? policy : await tx.vehicleInsurance.findFirst({ where: { companyId, vehicleId: record.vehicleId, status: 'ACTIVE' }, orderBy: { endDate: 'desc' } });
        await tx.vehicle.update({ where: { id: record.vehicleId }, data: { insuranceProvider: currentPolicy?.insurer ?? null, insuranceExpiration: currentPolicy?.endDate ?? null } });
        await tx.auditLog.create({ data: { companyId, userId: req.user!.userId, action: status === 'ACTIVE' ? 'REACTIVATE' : 'CANCEL', entity: 'VEHICLE_INSURANCE', entityId: record.id } });
        return policy;
      });
      res.json({ message: status === 'ACTIVE' ? 'Apólice reativada.' : 'Apólice cancelada; parcelas em aberto canceladas.', data: updated });
    } catch (error) { next(error); }
  }
}
export const vehicleInsuranceController = new VehicleInsuranceController();

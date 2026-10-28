import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaMaintenanceController, serializeMaintenance } from './maintenance.prisma.controller.js';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { HttpError } from '../utils/api-error.js';
import { updateMaintenanceSchema, maintenanceServiceSchema, maintenancePartSchema, maintenancePlanSchema, workshopSchema, supplierSchema } from '../schemas/maintenance.schema.js';
import { money, validDate } from '../services/financial.js';

const relations = { vehicle: true, services: true, parts: true, workshopRef: true, supplierRef: true, financialTransaction: true } as const;
export class PersistedMaintenanceController extends PrismaMaintenanceController {
  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId!;
      const record = await prisma.maintenance.findFirst({ where: { companyId, OR: [{ id: req.params.id }, { codigo: req.params.id }] }, include: relations });
      if (!record) throw new HttpError(404, 'Ordem não encontrada.');
      const auditLogs = await prisma.auditLog.findMany({ where: { companyId, entity: 'MAINTENANCE', entityId: record.id }, orderBy: { createdAt: 'desc' } });
      res.json({ data: { ...serializeMaintenance(record), services: record.services.map(item => ({ ...item, quantidade: Number(item.quantidade), valorUnitario: Number(item.valorUnitario), valorTotal: Number(item.valorTotal) })), parts: record.parts.map(item => ({ ...item, quantidade: Number(item.quantidade), valorUnitario: Number(item.valorUnitario), valorTotal: Number(item.valorTotal) })), financialTransaction: record.financialTransaction, auditLogs } });
    } catch (err) { next(err); }
  }

  private async editable(tx: Prisma.TransactionClient, id: string, companyId: string) {
    await tx.$queryRaw`SELECT id FROM maintenances WHERE (id = ${id} OR codigo = ${id}) AND "companyId" = ${companyId} FOR UPDATE`;
    const record = await tx.maintenance.findFirst({ where: { companyId, OR: [{ id }, { codigo: id }] }, include: relations });
    if (!record) throw new HttpError(404, 'Ordem não encontrada.');
    if (['COMPLETED', 'CANCELLED'].includes(record.status)) throw new HttpError(409, 'Ordem finalizada não pode ser alterada.');
    return record;
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId!;
      const data = updateMaintenanceSchema.parse(req.body);
      if (data.status || data.kmConclusao != null || data.dataInicio || data.dataConclusao)
        throw new HttpError(400, 'Use as ações de iniciar, concluir ou cancelar para alterar a situação.');
      const updated = await prisma.$transaction(async tx => {
        const record = await this.editable(tx, req.params.id, companyId);
        if (data.vehicleId && data.vehicleId !== record.vehicleId) throw new HttpError(400, 'O veículo da ordem não pode ser alterado.');
        for (const [id, query] of [
          [data.workshopId, () => tx.workshop.findFirst({ where: { id: data.workshopId!, companyId, ativo: true } })],
          [data.supplierId, () => tx.supplier.findFirst({ where: { id: data.supplierId!, companyId, ativo: true } })],
        ] as const) if (id && !await query()) throw new HttpError(400, 'Oficina ou fornecedor inválido.');
        if (data.kmEntrada !== undefined && (!Number.isInteger(data.kmEntrada) || data.kmEntrada < record.vehicle.currentMileage))
          throw new HttpError(400, 'KM de entrada não pode ser inferior ao KM atual.');
        const { dataAgendamento, dataInicio, dataConclusao, ...fields } = data;
        return tx.maintenance.update({ where: { id: record.id }, data: {
          ...fields, ...(dataAgendamento !== undefined ? { dataAgendamento: validDate(dataAgendamento) } : {}),
          custoTotal: record.custoPecas.plus(record.custoMaoDeObra).plus(data.custoOutros ?? record.custoOutros),
        }, include: relations });
      });
      res.json({ message: 'Ordem atualizada.', data: serializeMaintenance(updated) });
    } catch (err) { next(err); }
  }

  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId!;
      const updated = await prisma.$transaction(async tx => {
        const record = await this.editable(tx, req.params.id, companyId);
        await tx.$queryRaw`SELECT id FROM vehicles WHERE id = ${record.vehicleId} AND "companyId" = ${companyId} FOR UPDATE`;
        const updated = await tx.maintenance.update({ where: { id: record.id }, data: { status: 'CANCELLED' }, include: relations });
        const others = await tx.maintenance.count({ where: { companyId, vehicleId: record.vehicleId, status: { in: ['IN_PROGRESS', 'WAITING_PARTS'] } } });
        if (!others) await tx.vehicle.updateMany({ where: { id: record.vehicleId, companyId, status: 'MAINTENANCE' }, data: { status: 'AVAILABLE' } });
        await tx.auditLog.create({ data: { companyId, userId: req.user!.userId, action: 'CANCEL', entity: 'MAINTENANCE', entityId: record.id } });
        return updated;
      });
      res.json({ message: 'Ordem cancelada.', data: serializeMaintenance(updated) });
    } catch (err) { next(err); }
  }

  private async changeItem(req: AuthenticatedRequest, res: Response, next: NextFunction, kind: 'service' | 'part', remove: boolean) {
    try {
      const companyId = req.user!.companyId!;
      const data = remove ? null : (kind === 'service' ? maintenanceServiceSchema : maintenancePartSchema).parse(req.body);
      const updated = await prisma.$transaction(async tx => {
        const record = await this.editable(tx, req.params.id, companyId);
        if (remove) {
          const id = kind === 'service' ? req.params.serviceId : req.params.partId;
          const result = kind === 'service'
            ? await tx.maintenanceService.deleteMany({ where: { id, maintenanceId: record.id } })
            : await tx.maintenancePart.deleteMany({ where: { id, maintenanceId: record.id } });
          if (!result.count) throw new HttpError(404, 'Item não encontrado.');
        } else {
          const item = { ...data, maintenanceId: record.id, valorTotal: money(data!.quantidade).mul(data!.valorUnitario).toDecimalPlaces(2) };
          if (kind === 'service') await tx.maintenanceService.create({ data: item as Prisma.MaintenanceServiceUncheckedCreateInput });
          else await tx.maintenancePart.create({ data: item as Prisma.MaintenancePartUncheckedCreateInput });
        }
        const [services, parts] = await Promise.all([
          tx.maintenanceService.aggregate({ where: { maintenanceId: record.id }, _sum: { valorTotal: true } }),
          tx.maintenancePart.aggregate({ where: { maintenanceId: record.id }, _sum: { valorTotal: true } }),
        ]);
        const custoMaoDeObra = services._sum.valorTotal ?? money(0), custoPecas = parts._sum.valorTotal ?? money(0);
        return tx.maintenance.update({ where: { id: record.id }, data: { custoMaoDeObra, custoPecas, custoTotal: custoMaoDeObra.plus(custoPecas).plus(record.custoOutros) }, include: relations });
      });
      res.status(remove ? 200 : 201).json({ message: 'Itens atualizados.', data: serializeMaintenance(updated) });
    } catch (err) { next(err); }
  }
  addService(req: AuthenticatedRequest, res: Response, next: NextFunction) { return this.changeItem(req, res, next, 'service', false); }
  removeService(req: AuthenticatedRequest, res: Response, next: NextFunction) { return this.changeItem(req, res, next, 'service', true); }
  addPart(req: AuthenticatedRequest, res: Response, next: NextFunction) { return this.changeItem(req, res, next, 'part', false); }
  removePart(req: AuthenticatedRequest, res: Response, next: NextFunction) { return this.changeItem(req, res, next, 'part', true); }

  // The model/schema pairs are selected by server code, never by request input.
  private async catalog(req: AuthenticatedRequest, res: Response, next: NextFunction, kind: 'maintenancePlan' | 'workshop' | 'supplier', action: 'list' | 'create' | 'update' | 'delete') {
    try {
      const companyId = req.user!.companyId!;
      const model = prisma[kind] as any;
      if (action === 'list') {
        const rows = await model.findMany({ where: { companyId, ...(kind === 'maintenancePlan' && req.query.vehicleId ? { OR: [{ vehicleId: null }, { vehicleId: String(req.query.vehicleId) }] } : {}) }, ...(kind === 'maintenancePlan' ? { include: { vehicle: true } } : {}) });
        res.json({ total: rows.length, data: rows }); return;
      }
      const schema = kind === 'maintenancePlan' ? maintenancePlanSchema : kind === 'workshop' ? workshopSchema : supplierSchema;
      if (action === 'delete') {
        const result = await model.deleteMany({ where: { id: req.params.id, companyId } });
        if (!result.count) throw new HttpError(404, 'Registro não encontrado.');
        res.json({ message: 'Registro removido.' }); return;
      }
      const data: any = (action === 'update' ? schema.partial() : schema).parse(req.body);
      if (kind === 'maintenancePlan') {
        if (data.vehicleId && !await prisma.vehicle.findFirst({ where: { id: data.vehicleId, companyId } })) throw new HttpError(400, 'Veículo inválido.');
        for (const field of ['ultimaData', 'proximaData']) if (data[field]) data[field] = validDate(data[field]);
        if (action === 'create' && data.proximaKm == null && data.intervaloKm) data.proximaKm = (data.ultimaKm ?? 0) + data.intervaloKm;
      }
      if (action === 'update' && !await model.findFirst({ where: { id: req.params.id, companyId } })) throw new HttpError(404, 'Registro não encontrado.');
      const record = action === 'create' ? await model.create({ data: { ...data, companyId } })
        : await model.update({ where: { id: req.params.id, companyId }, data });
      res.status(action === 'create' ? 201 : 200).json({ message: 'Registro salvo.', data: record });
    } catch (err) { next(err); }
  }

  listPlans(req: AuthenticatedRequest, res: Response, next: NextFunction) { return this.catalog(req, res, next, 'maintenancePlan', 'list'); }
  createPlan(req: AuthenticatedRequest, res: Response, next: NextFunction) { return this.catalog(req, res, next, 'maintenancePlan', 'create'); }
  updatePlan(req: AuthenticatedRequest, res: Response, next: NextFunction) { return this.catalog(req, res, next, 'maintenancePlan', 'update'); }
  deletePlan(req: AuthenticatedRequest, res: Response, next: NextFunction) { return this.catalog(req, res, next, 'maintenancePlan', 'delete'); }
  listWorkshops(req: AuthenticatedRequest, res: Response, next: NextFunction) { return this.catalog(req, res, next, 'workshop', 'list'); }
  createWorkshop(req: AuthenticatedRequest, res: Response, next: NextFunction) { return this.catalog(req, res, next, 'workshop', 'create'); }
  updateWorkshop(req: AuthenticatedRequest, res: Response, next: NextFunction) { return this.catalog(req, res, next, 'workshop', 'update'); }
  deleteWorkshop(req: AuthenticatedRequest, res: Response, next: NextFunction) { return this.catalog(req, res, next, 'workshop', 'delete'); }
  listSuppliers(req: AuthenticatedRequest, res: Response, next: NextFunction) { return this.catalog(req, res, next, 'supplier', 'list'); }
  createSupplier(req: AuthenticatedRequest, res: Response, next: NextFunction) { return this.catalog(req, res, next, 'supplier', 'create'); }
  updateSupplier(req: AuthenticatedRequest, res: Response, next: NextFunction) { return this.catalog(req, res, next, 'supplier', 'update'); }
  deleteSupplier(req: AuthenticatedRequest, res: Response, next: NextFunction) { return this.catalog(req, res, next, 'supplier', 'delete'); }

  private async calculateAlerts(companyId: string) {
    const [vehicles, plans] = await Promise.all([
      prisma.vehicle.findMany({ where: { companyId }, include: { maintenances: { where: { status: 'COMPLETED' }, orderBy: { dataConclusao: 'desc' }, take: 1 } } }),
      prisma.maintenancePlan.findMany({ where: { companyId, status: 'ATIVO' } }),
    ]);
    const alerts = [];
    for (const vehicle of vehicles) for (const plan of plans.filter(p => !p.vehicleId || p.vehicleId === vehicle.id)) {
      const last = vehicle.maintenances[0];
      const proximaKm = plan.proximaKm ?? (plan.intervaloKm ? (plan.ultimaKm ?? last?.kmConclusao ?? 0) + plan.intervaloKm : null);
      const proximaData = plan.proximaData ?? (plan.intervaloDias ? new Date((plan.ultimaData ?? vehicle.createdAt).getTime() + plan.intervaloDias * 86400000) : null);
      const kmRestante = proximaKm === null ? null : proximaKm - vehicle.currentMileage;
      const diasRestantes = proximaData ? Math.ceil((proximaData.getTime() - Date.now()) / 86400000) : null;
      const rank = (value: number | null, threshold: number) => value === null ? 0 : value <= 0 ? 3 : value <= threshold ? 2 : value <= threshold * 2 ? 1 : 0;
      const severity = Math.max(
        proximaKm !== null ? rank(kmRestante, plan.alertaKmFaltando ?? 1000) : 0,
        proximaData ? rank(diasRestantes, plan.alertaDiasFaltando ?? 15) : 0,
      );
      alerts.push({ id: `${vehicle.id}-${plan.id}`, vehicleId: vehicle.id, vehiclePlate: vehicle.plate,
        vehicleModel: `${vehicle.brand} ${vehicle.model}`, currentMileage: vehicle.currentMileage, serviceName: plan.nomeServico,
        tipo: proximaKm !== null && proximaData ? 'AMBOS' : proximaKm !== null ? 'KM' : 'DATA', proximaKm, kmRestante,
        proximaData: proximaData?.toISOString().slice(0, 10) ?? null, diasRestantes,
        nivelAlerta: ['OK', 'ATENCAO', 'PROXIMA', 'VENCIDA'][severity], motivo: `KM restante: ${kmRestante ?? '—'}; dias restantes: ${diasRestantes ?? '—'}`, severity });
    }
    return alerts.sort((a, b) => b.severity - a.severity);
  }
  async alerts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { const data = await this.calculateAlerts(req.user!.companyId!); res.json({ total: data.length, data }); } catch (err) { next(err); }
  }
}
export const maintenanceController = new PersistedMaintenanceController();

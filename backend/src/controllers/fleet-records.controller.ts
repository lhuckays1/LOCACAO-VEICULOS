import { NextFunction, Response } from 'express';
import { FineStatus, IncidentStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { HttpError } from '../utils/api-error.js';

const fineSchema = z.object({
  vehicleId: z.string().min(1), clientId: z.string().nullable().optional(),
  date: z.coerce.date(), dueDate: z.coerce.date(), location: z.string().trim().min(2),
  description: z.string().trim().min(3), amount: z.coerce.number().positive(),
  points: z.coerce.number().int().min(0).default(0), status: z.nativeEnum(FineStatus).optional(),
  notes: z.string().nullable().optional(),
});
const incidentSchema = z.object({
  vehicleId: z.string().min(1), clientId: z.string().nullable().optional(), type: z.string().trim().min(2),
  date: z.coerce.date(), description: z.string().trim().min(3),
  status: z.nativeEnum(IncidentStatus).optional(), notes: z.string().nullable().optional(),
});
const include = { vehicle: { select: { id: true, plate: true, brand: true, model: true } }, client: { select: { id: true, name: true } } } as const;

export class FleetRecordsController {
  private async list(req: AuthenticatedRequest, res: Response, next: NextFunction, kind: 'fine' | 'incident') {
    try {
      const companyId = req.user!.companyId!;
      const search = String(req.query.search ?? '').trim();
      const status = String(req.query.status ?? 'ALL');
      const startDate = req.query.startDate ? new Date(`${req.query.startDate}T00:00:00`) : undefined;
      const endDate = req.query.endDate ? new Date(`${req.query.endDate}T23:59:59.999`) : undefined;
      if ((startDate && !Number.isFinite(startDate.getTime())) || (endDate && !Number.isFinite(endDate.getTime()))) throw new HttpError(400, 'Período informado inválido.');
      const model = prisma[kind] as any;
      const where: any = { companyId, ...(status !== 'ALL' ? { status } : {}), ...(req.query.vehicleId ? { vehicleId: String(req.query.vehicleId) } : {}), ...(startDate || endDate ? { date: { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) } } : {}), ...(search ? { OR: [{ description: { contains: search, mode: 'insensitive' } }, { vehicle: { plate: { contains: search, mode: 'insensitive' } } }, { client: { name: { contains: search, mode: 'insensitive' } } }] } : {}) };
      const data = await model.findMany({ where, include, orderBy: { date: 'desc' } } as any);
      res.json({ total: data.length, data: data.map((item: any) => ({ ...item, ...(kind === 'fine' ? { amount: Number(item.amount) } : {}) })) });
    } catch (error) { next(error); }
  }
  listFines(req: AuthenticatedRequest, res: Response, next: NextFunction) { return this.list(req, res, next, 'fine'); }
  listIncidents(req: AuthenticatedRequest, res: Response, next: NextFunction) { return this.list(req, res, next, 'incident'); }

  private async save(req: AuthenticatedRequest, res: Response, next: NextFunction, kind: 'fine' | 'incident') {
    try {
      const companyId = req.user!.companyId!;
      const model = prisma[kind] as any;
      const schema = kind === 'fine' ? fineSchema : incidentSchema;
      const parsed = (req.method === 'PUT' ? schema.partial() : schema).parse(req.body);
      const data: any = { ...parsed };
      const vehicleId = data.vehicleId ?? (req.method === 'PUT' ? (await model.findFirst({ where: { id: req.params.id, companyId } }))?.vehicleId : undefined);
      if (!vehicleId) throw new HttpError(404, 'Registro não encontrado.');
      const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, companyId } });
      if (!vehicle) throw new HttpError(400, 'Veículo inválido para esta empresa.');
      if (data.clientId) {
        const client = await prisma.client.findFirst({ where: { id: data.clientId, companyId } });
        if (!client) throw new HttpError(400, 'Cliente inválido para esta empresa.');
      }
      if (req.method === 'PUT') {
        const exists = await model.findFirst({ where: { id: req.params.id, companyId } });
        if (!exists) throw new HttpError(404, 'Registro não encontrado.');
        const updated = await model.update({ where: { id: req.params.id }, data, include });
        res.json({ message: 'Registro atualizado.', data: { ...updated, ...(kind === 'fine' ? { amount: Number(updated.amount) } : {}) } });
      } else {
        const created = await model.create({ data: { ...data, companyId }, include });
        res.status(201).json({ message: 'Registro criado.', data: { ...created, ...(kind === 'fine' ? { amount: Number(created.amount) } : {}) } });
      }
    } catch (error) { next(error); }
  }
  saveFine(req: AuthenticatedRequest, res: Response, next: NextFunction) { return this.save(req, res, next, 'fine'); }
  saveIncident(req: AuthenticatedRequest, res: Response, next: NextFunction) { return this.save(req, res, next, 'incident'); }

  private async remove(req: AuthenticatedRequest, res: Response, next: NextFunction, kind: 'fine' | 'incident') {
    try {
      const result = await (prisma[kind] as any).deleteMany({ where: { id: req.params.id, companyId: req.user!.companyId! } });
      if (!result.count) throw new HttpError(404, 'Registro não encontrado.');
      res.json({ message: 'Registro removido.' });
    } catch (error) { next(error); }
  }
  deleteFine(req: AuthenticatedRequest, res: Response, next: NextFunction) { return this.remove(req, res, next, 'fine'); }
  deleteIncident(req: AuthenticatedRequest, res: Response, next: NextFunction) { return this.remove(req, res, next, 'incident'); }
}

export class ReportsController {
  async get(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId!;
      const endDate = req.query.endDate ? new Date(`${req.query.endDate}T23:59:59.999`) : new Date();
      const startDate = req.query.startDate ? new Date(`${req.query.startDate}T00:00:00`) : new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || startDate > endDate) throw new HttpError(400, 'Informe um período válido.');
      const range = { gte: startDate, lte: endDate };
      const [vehicles, rentals, fines, incidents, inspections, maintenance, expenses] = await Promise.all([
        prisma.vehicle.count({ where: { companyId } }),
        prisma.rental.findMany({ where: { companyId, startDate: range }, select: { id: true, rentalNumber: true, status: true, amount: true, startDate: true, vehicle: { select: { plate: true } }, client: { select: { name: true } } }, orderBy: { startDate: 'desc' } }),
        prisma.fine.findMany({ where: { companyId, date: range }, include, orderBy: { date: 'desc' } }),
        prisma.incident.findMany({ where: { companyId, date: range }, include, orderBy: { date: 'desc' } }),
        prisma.inspection.findMany({ where: { companyId, createdAt: range }, include: { vehicle: { select: { plate: true } }, client: { select: { name: true } }, rental: { select: { rentalNumber: true } } }, orderBy: { createdAt: 'desc' } }),
        prisma.maintenance.findMany({ where: { companyId, dataAgendamento: range }, include: { vehicle: { select: { plate: true } } }, orderBy: { dataAgendamento: 'desc' } }),
        prisma.expense.aggregate({ where: { companyId, date: range }, _sum: { amount: true }, _count: true }),
      ]);
      const fineAmount = fines.reduce((sum, item) => sum + Number(item.amount), 0);
      res.json({ period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() }, summary: { vehicles, rentals: rentals.length, rentalRevenue: rentals.reduce((sum, item) => sum + Number(item.amount), 0), fines: fines.length, fineAmount, incidents: incidents.length, inspections: inspections.length, maintenance: maintenance.length, expenses: Number(expenses._sum.amount ?? 0) }, rentals: rentals.map(item => ({ ...item, amount: Number(item.amount) })), fines: fines.map(item => ({ ...item, amount: Number(item.amount) })), incidents, inspections, maintenance: maintenance.map(item => ({ ...item, custoTotal: Number(item.custoTotal) })) });
    } catch (error) { next(error); }
  }
}

export const fleetRecordsController = new FleetRecordsController();
export const reportsController = new ReportsController();

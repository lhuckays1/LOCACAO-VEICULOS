import { Response, NextFunction } from 'express';
import { InspectionType, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

function serializeInspection(item: any) {
  const parse = (value: string | null | undefined, fallback: any) => {
    try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
  };

  return {
    id: item.id,
    companyId: item.companyId,
    rentalId: item.rentalId,
    vehicleId: item.vehicleId,
    clientId: item.clientId,
    type: item.type,
    mileage: item.mileage,
    fuelLevel: item.fuelLevel,
    notes: item.notes,
    checklist: parse(item.itemsJson, []),
    photos: parse(item.photosJson, []),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    vehicle: item.vehicle ? {
      id: item.vehicle.id,
      plate: item.vehicle.plate,
      brand: item.vehicle.brand,
      model: item.vehicle.model,
      version: item.vehicle.version,
      currentMileage: item.vehicle.currentMileage,
    } : null,
    rental: item.rental ? {
      id: item.rental.id,
      rentalNumber: item.rental.rentalNumber,
      startDate: item.rental.startDate,
      endDate: item.rental.endDate,
      status: item.rental.status,
    } : null,
    client: item.client ? {
      id: item.client.id,
      name: item.client.name,
      cpfCnpj: item.client.cpfCnpj,
      phone: item.client.phone,
    } : null,
  };
}

const includes = {
  vehicle: true,
  rental: true,
  client: true,
} as const;

export class InspectionsController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { vehicleId, rentalId, type, search } = req.query;

      const where: Prisma.InspectionWhereInput = { companyId };

      if (vehicleId && vehicleId !== 'ALL') where.vehicleId = String(vehicleId);
      if (rentalId && rentalId !== 'ALL') where.rentalId = String(rentalId);
      if (type && type !== 'ALL') where.type = String(type).toUpperCase() as InspectionType;

      if (search) {
        const term = String(search).trim();
        where.OR = [
          { vehicle: { plate: { contains: term, mode: 'insensitive' } } },
          { client: { name: { contains: term, mode: 'insensitive' } } },
          { rental: { rentalNumber: { contains: term, mode: 'insensitive' } } },
        ];
      }

      const data = await prisma.inspection.findMany({
        where,
        include: includes,
        orderBy: { createdAt: 'desc' },
      });

      res.json({ total: data.length, data: data.map(serializeInspection) });
    } catch (err) { next(err); }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const inspection = await prisma.inspection.findFirst({
        where: { id: req.params.id, companyId: req.user!.companyId },
        include: includes,
      });

      if (!inspection) {
        res.status(404).json({ error: 'INSPECTION_NOT_FOUND', message: 'Vistoria não encontrada.' });
        return;
      }

      res.json({ data: serializeInspection(inspection) });
    } catch (err) { next(err); }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { vehicleId, rentalId, clientId, type, mileage, fuelLevel, notes, checklist, photos } = req.body;

      if (!vehicleId) {
        res.status(400).json({ error: 'VEHICLE_REQUIRED', message: 'Selecione um veículo.' });
        return;
      }

      const vehicle = await prisma.vehicle.findFirst({ where: { id: String(vehicleId), companyId } });
      if (!vehicle) {
        res.status(404).json({ error: 'VEHICLE_NOT_FOUND', message: 'Veículo não encontrado nesta empresa.' });
        return;
      }

      const normalizedType = String(type || 'CHECKOUT').toUpperCase() as InspectionType;
      if (!['CHECKOUT', 'CHECKIN'].includes(normalizedType)) {
        res.status(400).json({ error: 'INVALID_TYPE', message: 'Tipo de vistoria inválido.' });
        return;
      }

      const km = Number(mileage);
      if (!Number.isInteger(km) || km < 0) {
        res.status(400).json({ error: 'INVALID_MILEAGE', message: 'Informe um KM válido.' });
        return;
      }

      const rental = rentalId ? await prisma.rental.findFirst({
        where: { id: String(rentalId), companyId, vehicleId: vehicle.id },
      }) : null;

      if (rentalId && !rental) {
        res.status(404).json({ error: 'RENTAL_NOT_FOUND', message: 'Locação não encontrada para este veículo.' });
        return;
      }

      const client = clientId ? await prisma.client.findFirst({
        where: { id: String(clientId), companyId },
      }) : null;

      if (clientId && !client) {
        res.status(404).json({ error: 'CLIENT_NOT_FOUND', message: 'Cliente não encontrado nesta empresa.' });
        return;
      }

      const created = await prisma.$transaction(async (tx) => {
        const inspection = await tx.inspection.create({
          data: {
            companyId,
            vehicleId: vehicle.id,
            rentalId: rental?.id || null,
            clientId: client?.id || null,
            type: normalizedType,
            mileage: km,
            fuelLevel: String(fuelLevel || 'FULL'),
            notes: notes ? String(notes).trim() : null,
            itemsJson: JSON.stringify(Array.isArray(checklist) ? checklist : []),
            photosJson: JSON.stringify(Array.isArray(photos) ? photos : []),
          },
          include: includes,
        });

        if (km > vehicle.currentMileage) {
          await tx.vehicle.update({ where: { id: vehicle.id }, data: { currentMileage: km } });
          await tx.vehicleMileage.create({
            data: {
              vehicleId: vehicle.id,
              mileage: km,
              type: normalizedType === 'CHECKOUT' ? 'RENTAL_START' : 'RENTAL_END',
              notes: `VISTORIA ${normalizedType === 'CHECKOUT' ? 'DE SAÍDA' : 'DE ENTREGA'} - ${inspection.id}`,
              createdBy: req.user!.userId,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            companyId,
            userId: req.user!.userId,
            action: 'CREATE',
            entity: 'INSPECTION',
            entityId: inspection.id,
            oldData: null,
            newData: JSON.stringify({ vehicleId: vehicle.id, type: normalizedType, mileage: km }),
          },
        });

        return inspection;
      }, { maxWait: 10000, timeout: 30000 });

      res.status(201).json({ message: 'Vistoria registrada com sucesso!', data: serializeInspection(created) });
    } catch (err) { next(err); }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const inspection = await prisma.inspection.findFirst({ where: { id: req.params.id, companyId } });

      if (!inspection) {
        res.status(404).json({ error: 'INSPECTION_NOT_FOUND', message: 'Vistoria não encontrada.' });
        return;
      }

      await prisma.$transaction(async (tx) => {
        await tx.inspection.delete({ where: { id: inspection.id } });
        await tx.auditLog.create({
          data: {
            companyId,
            userId: req.user!.userId,
            action: 'DELETE',
            entity: 'INSPECTION',
            entityId: inspection.id,
            oldData: JSON.stringify({ vehicleId: inspection.vehicleId, rentalId: inspection.rentalId, type: inspection.type, mileage: inspection.mileage }),
            newData: null,
          },
        });
      }, { maxWait: 10000, timeout: 30000 });

      res.json({ message: 'Vistoria excluída com sucesso!', data: { id: inspection.id } });
    } catch (err) { next(err); }
  }
}

export const inspectionsController = new InspectionsController();

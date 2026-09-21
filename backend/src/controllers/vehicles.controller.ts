import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

import { prisma } from '../config/prisma.js';
import { vehicleSchema } from '../schemas/index.js';
import { unmask } from '../utils/formatters.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

function normalizePlate(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function normalizeText(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toUpperCase();
  return normalized || null;
}

function toDate(value?: string | null): Date | null {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function serializeVehicle<T extends Record<string, any>>(vehicle: T): T {
  return vehicle;
}

export class VehiclesController {
  async list(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { search, status, category } = req.query;

      if (!companyId) {
        res.status(403).json({
          error: 'COMPANY_REQUIRED',
          message: 'Usuário não está vinculado a uma empresa.',
        });
        return;
      }

      const where: Prisma.VehicleWhereInput = {
        companyId,
      };

      if (status && typeof status === 'string' && status !== 'ALL') {
        where.status = status as Prisma.VehicleWhereInput['status'];
      }

      if (category && typeof category === 'string' && category !== 'ALL') {
        where.category = {
          equals: category.toUpperCase(),
          mode: 'insensitive',
        };
      }

      if (search && typeof search === 'string' && search.trim()) {
        const query = search.trim();
        const normalizedQuery = unmask(query).toUpperCase();

        where.OR = [
          {
            plate: {
              contains: normalizedQuery,
              mode: 'insensitive',
            },
          },
          {
            brand: {
              contains: query.toUpperCase(),
              mode: 'insensitive',
            },
          },
          {
            model: {
              contains: query.toUpperCase(),
              mode: 'insensitive',
            },
          },
          {
            renavam: {
              contains: normalizedQuery,
              mode: 'insensitive',
            },
          },
          {
            tracker: {
              contains: query.toUpperCase(),
              mode: 'insensitive',
            },
          },
        ];
      }

      const vehicles = await prisma.vehicle.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
      });

      const rentedVehicleIds = vehicles
        .filter((vehicle) => vehicle.status === 'RENTED')
        .map((vehicle) => vehicle.id);

      const activeRentals =
        rentedVehicleIds.length > 0
          ? await prisma.rental.findMany({
              where: {
                companyId,
                vehicleId: {
                  in: rentedVehicleIds,
                },
                status: 'ACTIVE',
              },
              include: {
                client: true,
              },
            })
          : [];

      const rentalByVehicleId = new Map(
        activeRentals.map((rental) => [rental.vehicleId, rental]),
      );

      const enrichedVehicles = vehicles.map((vehicle) => {
        const rental = rentalByVehicleId.get(vehicle.id);

        return {
          ...serializeVehicle(vehicle),
          activeRental: rental
            ? {
                rentalId: rental.id,
                rentalNumber: rental.rentalNumber,
                clientName: rental.client?.name ?? 'N/A',
                startDate: rental.startDate,
                endDate: rental.endDate,
                amount: rental.amount,
              }
            : null,
        };
      });

      res.json({
        total: enrichedVehicles.length,
        data: enrichedVehicles,
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      if (!companyId) {
        res.status(403).json({
          error: 'COMPANY_REQUIRED',
          message: 'Usuário não está vinculado a uma empresa.',
        });
        return;
      }

      const vehicle = await prisma.vehicle.findFirst({
        where: {
          id,
          companyId,
        },
        include: {
          rentals: {
            where: {
              companyId,
            },
            orderBy: {
              createdAt: 'desc',
            },
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                  cpfCnpj: true,
                  phone: true,
                },
              },
            },
          },
          maintenances: {
            where: {
              companyId,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          mileageLogs: {
            orderBy: {
              date: 'desc',
            },
          },
          fines: {
            where: {
              companyId,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
          expenses: {
            where: {
              companyId,
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!vehicle) {
        res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'Veículo não encontrado.',
        });
        return;
      }

      res.json({
        data: vehicle,
      });
    } catch (err) {
      next(err);
    }
  }

  async create(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      if (!companyId) {
        res.status(403).json({
          error: 'COMPANY_REQUIRED',
          message: 'Usuário não está vinculado a uma empresa.',
        });
        return;
      }

      const data = vehicleSchema.parse(req.body);
      const cleanPlate = normalizePlate(data.plate);

      const existing = await prisma.vehicle.findFirst({
        where: {
          companyId,
          plate: cleanPlate,
        },
        select: {
          id: true,
        },
      });

      if (existing) {
        res.status(409).json({
          error: 'PLATE_ALREADY_EXISTS',
          message: `Já existe um veículo cadastrado com a placa ${cleanPlate} nesta empresa.`,
        });
        return;
      }

      const vehicle = await prisma.$transaction(async (tx) => {
        const createdVehicle = await tx.vehicle.create({
          data: {
            companyId,
            plate: cleanPlate,
            brand: data.brand.trim().toUpperCase(),
            model: data.model.trim().toUpperCase(),
            version: normalizeText(data.version),
            manufactureYear: data.manufactureYear,
            modelYear: data.modelYear,
            color: data.color.trim().toUpperCase(),
            fuel: data.fuel.trim().toUpperCase(),
            category: data.category.trim().toUpperCase(),
            vehicleType: normalizeText(data.vehicleType) ?? 'CARRO',
            status: data.status ?? 'AVAILABLE',
            renavam: data.renavam ? unmask(data.renavam) : null,
            chassis: normalizeText(data.chassis),
            engine: normalizeText(data.engine),
            currentMileage: data.currentMileage ?? 0,
            power: normalizeText(data.power),
            displacement: normalizeText(data.displacement),
            passengerCapacity: data.passengerCapacity ?? null,
            purchaseValue: data.purchaseValue ?? null,
            purchaseDate: toDate(data.purchaseDate),
            dailyRate: data.dailyRate,
            weeklyRate: data.weeklyRate,
            biweeklyRate: data.biweeklyRate ?? null,
            monthlyRate: data.monthlyRate,
            mileageAllowance: data.mileageAllowance ?? 0,
            excessMileageRate: data.excessMileageRate ?? 0.5,
            nextMaintenanceDate: toDate(data.nextMaintenanceDate),
            insuranceProvider: normalizeText(data.insuranceProvider),
            insuranceExpiration: toDate(data.insuranceExpiration),
            tracker: normalizeText(data.tracker),
            notes: normalizeText(data.notes),
          },
        });

        await tx.vehicleMileage.create({
          data: {
            vehicleId: createdVehicle.id,
            mileage: createdVehicle.currentMileage,
            date: new Date(),
            type: 'MANUAL',
            notes: 'QUILOMETRAGEM INICIAL DE CADASTRO NO SISTEMA',
            createdBy: req.user!.name,
          },
        });

        await tx.auditLog.create({
          data: {
            companyId,
            userId: req.user!.userId,
            action: 'CREATE',
            entity: 'VEHICLE',
            entityId: createdVehicle.id,
            oldData: null,
            newData: JSON.stringify({
              plate: createdVehicle.plate,
              model: createdVehicle.model,
            }),
          },
        });

        return createdVehicle;
      });

      res.status(201).json({
        message: 'Veículo cadastrado com sucesso!',
        data: vehicle,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        res.status(409).json({
          error: 'PLATE_ALREADY_EXISTS',
          message: 'Já existe um veículo cadastrado com essa placa nesta empresa.',
        });
        return;
      }

      next(err);
    }
  }

  async update(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      if (!companyId) {
        res.status(403).json({
          error: 'COMPANY_REQUIRED',
          message: 'Usuário não está vinculado a uma empresa.',
        });
        return;
      }

      const data = vehicleSchema.parse(req.body);
      const cleanPlate = normalizePlate(data.plate);

      const existingVehicle = await prisma.vehicle.findFirst({
        where: {
          id,
          companyId,
        },
      });

      if (!existingVehicle) {
        res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'Veículo não encontrado.',
        });
        return;
      }

      const conflict = await prisma.vehicle.findFirst({
        where: {
          companyId,
          plate: cleanPlate,
          NOT: {
            id,
          },
        },
        select: {
          id: true,
        },
      });

      if (conflict) {
        res.status(409).json({
          error: 'PLATE_ALREADY_EXISTS',
          message: `Outro veículo já está cadastrado com a placa ${cleanPlate}.`,
        });
        return;
      }

      if (data.currentMileage < existingVehicle.currentMileage) {
        res.status(400).json({
          error: 'INVALID_MILEAGE',
          message: `A quilometragem informada (${data.currentMileage} km) não pode ser inferior à quilometragem registrada atual (${existingVehicle.currentMileage} km).`,
        });
        return;
      }

      const updatedVehicle = await prisma.$transaction(async (tx) => {
        const vehicle = await tx.vehicle.update({
          where: {
            id: existingVehicle.id,
          },
          data: {
            plate: cleanPlate,
            brand: data.brand.trim().toUpperCase(),
            model: data.model.trim().toUpperCase(),
            version: normalizeText(data.version),
            manufactureYear: data.manufactureYear,
            modelYear: data.modelYear,
            color: data.color.trim().toUpperCase(),
            fuel: data.fuel.trim().toUpperCase(),
            category: data.category.trim().toUpperCase(),
            vehicleType:
              normalizeText(data.vehicleType) ??
              existingVehicle.vehicleType ??
              'CARRO',
            status: data.status ?? existingVehicle.status,
            renavam: data.renavam ? unmask(data.renavam) : null,
            chassis: normalizeText(data.chassis),
            engine: normalizeText(data.engine),
            currentMileage: data.currentMileage,
            power: normalizeText(data.power),
            displacement: normalizeText(data.displacement),
            passengerCapacity:
              data.passengerCapacity !== undefined
                ? data.passengerCapacity
                : existingVehicle.passengerCapacity,
            purchaseValue: data.purchaseValue ?? null,
            purchaseDate: toDate(data.purchaseDate),
            dailyRate: data.dailyRate,
            weeklyRate: data.weeklyRate,
            biweeklyRate: data.biweeklyRate ?? null,
            monthlyRate: data.monthlyRate,
            mileageAllowance: data.mileageAllowance ?? 0,
            excessMileageRate: data.excessMileageRate ?? 0.5,
            nextMaintenanceDate: toDate(data.nextMaintenanceDate),
            insuranceProvider: normalizeText(data.insuranceProvider),
            insuranceExpiration: toDate(data.insuranceExpiration),
            tracker: normalizeText(data.tracker),
            notes: normalizeText(data.notes),
          },
        });

        if (data.currentMileage > existingVehicle.currentMileage) {
          await tx.vehicleMileage.create({
            data: {
              vehicleId: existingVehicle.id,
              mileage: data.currentMileage,
              date: new Date(),
              type: 'MANUAL',
              notes: 'ATUALIZAÇÃO MANUAL DE QUILOMETRAGEM',
              createdBy: req.user!.name,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            companyId,
            userId: req.user!.userId,
            action: 'UPDATE',
            entity: 'VEHICLE',
            entityId: vehicle.id,
            oldData: JSON.stringify({
              plate: existingVehicle.plate,
              model: existingVehicle.model,
              status: existingVehicle.status,
              currentMileage: existingVehicle.currentMileage,
            }),
            newData: JSON.stringify({
              plate: vehicle.plate,
              model: vehicle.model,
              status: vehicle.status,
              currentMileage: vehicle.currentMileage,
            }),
          },
        });

        return vehicle;
      });

      res.json({
        message: 'Veículo atualizado com sucesso!',
        data: updatedVehicle,
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        res.status(409).json({
          error: 'PLATE_ALREADY_EXISTS',
          message: 'Outro veículo já está cadastrado com essa placa.',
        });
        return;
      }

      next(err);
    }
  }

  async delete(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      if (!companyId) {
        res.status(403).json({
          error: 'COMPANY_REQUIRED',
          message: 'Usuário não está vinculado a uma empresa.',
        });
        return;
      }

      const vehicle = await prisma.vehicle.findFirst({
        where: {
          id,
          companyId,
        },
        include: {
          _count: {
            select: {
              rentals: true,
              maintenances: true,
              mileageLogs: true,
              fines: true,
              expenses: true,
              incidents: true,
              inspections: true,
              financialTransactions: true,
              maintenancePlans: true,
            },
          },
        },
      });

      if (!vehicle) {
        res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'Veículo não encontrado.',
        });
        return;
      }

      await prisma.$transaction(async (tx) => {
        // Exclusão DEFINITIVA: primeiro removemos os registros dependentes
        // que possuem FK restritiva ou histórico financeiro vinculado.
        //
        // A operação é transacional: se qualquer etapa falhar, nada é
        // removido do banco.

        // 1) Auditoria da exclusão.
        // EXCLUSÃO DEFINITIVA
        // Remove primeiro todos os registros dependentes para que as FKs
        // restritivas não impeçam a remoção do veículo.

        // 1) Transações financeiras do veículo e das locações do veículo.
        const vehicleFinancialTransactions =
          await tx.financialTransaction.findMany({
            where: {
              OR: [
                { vehicleId: vehicle.id },
                { rental: { vehicleId: vehicle.id } },
              ],
            },
            select: { id: true },
          });

        const financialTransactionIds = vehicleFinancialTransactions.map(
          (item) => item.id,
        );

        if (financialTransactionIds.length > 0) {
          await tx.financialSettlement.deleteMany({
            where: {
              transactionId: {
                in: financialTransactionIds,
              },
            },
          });

          await tx.financialTransaction.deleteMany({
            where: {
              id: {
                in: financialTransactionIds,
              },
            },
          });
        }

        // 2) Locações do veículo e seus registros dependentes.
        const vehicleRentals = await tx.rental.findMany({
          where: {
            vehicleId: vehicle.id,
            companyId,
          },
          select: { id: true },
        });

        const rentalIds = vehicleRentals.map((item) => item.id);

        if (rentalIds.length > 0) {
          await tx.payment.deleteMany({
            where: {
              rentalId: {
                in: rentalIds,
              },
            },
          });

          await tx.rentalPayment.deleteMany({
            where: {
              rentalId: {
                in: rentalIds,
              },
            },
          });

          await tx.contract.deleteMany({
            where: {
              rentalId: {
                in: rentalIds,
              },
            },
          });

          await tx.inspection.deleteMany({
            where: {
              rentalId: {
                in: rentalIds,
              },
            },
          });

          await tx.rental.deleteMany({
            where: {
              id: {
                in: rentalIds,
              },
            },
          });
        }

        // 3) Registros diretamente vinculados ao veículo.
        await tx.vehicleMileage.deleteMany({
          where: {
            vehicleId: vehicle.id,
          },
        });

        await tx.maintenancePlan.deleteMany({
          where: {
            vehicleId: vehicle.id,
          },
        });

        await tx.fine.deleteMany({
          where: {
            vehicleId: vehicle.id,
          },
        });

        await tx.incident.deleteMany({
          where: {
            vehicleId: vehicle.id,
          },
        });

        await tx.inspection.deleteMany({
          where: {
            vehicleId: vehicle.id,
          },
        });

        await tx.maintenance.deleteMany({
          where: {
            vehicleId: vehicle.id,
          },
        });

        await tx.expense.deleteMany({
          where: {
            vehicleId: vehicle.id,
          },
        });

        await tx.auditLog.create({
          data: {
            companyId,
            userId: req.user!.userId,
            action: 'DELETE',
            entity: 'VEHICLE',
            entityId: vehicle.id,
            oldData: JSON.stringify({
              plate: vehicle.plate,
              brand: vehicle.brand,
              model: vehicle.model,
              status: vehicle.status,
            }),
            newData: JSON.stringify({
              deleted: true,
              definitive: true,
              relatedRecordsDeleted: true,
            }),
          },
        });

        await tx.vehicle.delete({
          where: {
            id: vehicle.id,
          },
        });
      });

      res.json({
        message: 'Veículo e todos os registros vinculados foram excluídos definitivamente com sucesso.',
        data: {
          id: vehicle.id,
          plate: vehicle.plate,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const vehiclesController = new VehiclesController();

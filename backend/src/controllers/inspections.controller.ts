import { NextFunction, Request, Response } from 'express';
import { InspectionType, Prisma } from '@prisma/client';

import { prisma } from '../config/prisma.js';

type AuthenticatedRequest = Request & {
  user?: {
    userId: string;
    companyId: string;
    role?: string;
  };
};

/**
 * ============================================================
 * HELPERS
 * ============================================================
 */

function parseJsonField(value: unknown): unknown {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function serializeInspection(item: any) {
  return {
    ...item,

    mileage: Number(item.mileage ?? 0),

    items: parseJsonField(item.itemsJson),
    photos: parseJsonField(item.photosJson),

    // Mantemos os campos originais para compatibilidade
    itemsJson: item.itemsJson ?? null,
    photosJson: item.photosJson ?? null,

    vehicle: item.vehicle
      ? {
          id: item.vehicle.id,
          plate: item.vehicle.plate,
          brand: item.vehicle.brand,
          model: item.vehicle.model,
          color: item.vehicle.color,
          currentMileage: item.vehicle.currentMileage,
        }
      : null,

    client: item.client
      ? {
          id: item.client.id,
          name: item.client.name,
          cpfCnpj: item.client.cpfCnpj,
          phone: item.client.phone,
        }
      : null,

    rental: item.rental
      ? {
          id: item.rental.id,
          rentalNumber: item.rental.rentalNumber,
          codigoContrato: item.rental.codigoContrato,
          startDate: item.rental.startDate,
          endDate: item.rental.endDate,
          status: item.rental.status,
        }
      : null,
  };
}

function normalizeJsonField(value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'string') {
    try {
      JSON.parse(value);
      return value;
    } catch {
      return JSON.stringify(value);
    }
  }

  return JSON.stringify(value);
}

function getCompanyId(req: AuthenticatedRequest): string | null {
  return req.user?.companyId || null;
}

function normalizeType(value: unknown): InspectionType {
  const type = String(value || 'CHECKOUT').toUpperCase();

  if (type !== 'CHECKOUT' && type !== 'CHECKIN') {
    throw new Error('Tipo de vistoria inválido. Utilize CHECKOUT ou CHECKIN.');
  }

  return type as InspectionType;
}

/**
 * ============================================================
 * CONTROLLER
 * ============================================================
 */

export class InspectionsController {
  /**
   * GET /api/inspections
   *
   * Lista as vistorias da empresa autenticada.
   */
  async list(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const companyId = getCompanyId(req);

      if (!companyId) {
        res.status(401).json({
          error: 'COMPANY_NOT_FOUND',
          message: 'Empresa do usuário não identificada.',
        });
        return;
      }

      const {
        type,
        vehicleId,
        rentalId,
        clientId,
        search,
        startDate,
        endDate,
      } = req.query;

      const where: Prisma.InspectionWhereInput = {
        companyId,
      };

      if (type && String(type).toUpperCase() !== 'ALL') {
        where.type = normalizeType(type);
      }

      if (vehicleId) {
        where.vehicleId = String(vehicleId);
      }

      if (rentalId) {
        where.rentalId = String(rentalId);
      }

      if (clientId) {
        where.clientId = String(clientId);
      }

      if (search) {
        const searchText = String(search).trim();

        if (searchText) {
          where.OR = [
            {
              vehicle: {
                plate: {
                  contains: searchText,
                  mode: 'insensitive',
                },
              },
            },
            {
              client: {
                name: {
                  contains: searchText,
                  mode: 'insensitive',
                },
              },
            },
            {
              rental: {
                rentalNumber: {
                  contains: searchText,
                  mode: 'insensitive',
                },
              },
            },
            {
              notes: {
                contains: searchText,
                mode: 'insensitive',
              },
            },
          ];
        }
      }

      if (startDate || endDate) {
        const createdAt: Prisma.DateTimeFilter = {};

        if (startDate) {
          const start = new Date(`${String(startDate)}T00:00:00`);

          if (!Number.isNaN(start.getTime())) {
            createdAt.gte = start;
          }
        }

        if (endDate) {
          const end = new Date(`${String(endDate)}T23:59:59.999`);

          if (!Number.isNaN(end.getTime())) {
            createdAt.lte = end;
          }
        }

        where.createdAt = createdAt;
      }

      const data = await prisma.inspection.findMany({
        where,
        include: {
          vehicle: {
            select: {
              id: true,
              plate: true,
              brand: true,
              model: true,
              color: true,
              currentMileage: true,
            },
          },
          client: {
            select: {
              id: true,
              name: true,
              cpfCnpj: true,
              phone: true,
            },
          },
          rental: {
            select: {
              id: true,
              rentalNumber: true,
              codigoContrato: true,
              startDate: true,
              endDate: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json({
        total: data.length,
        data: data.map(serializeInspection),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/inspections/:id
   */
  async getById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const companyId = getCompanyId(req);
      const { id } = req.params;

      if (!companyId) {
        res.status(401).json({
          error: 'COMPANY_NOT_FOUND',
          message: 'Empresa do usuário não identificada.',
        });
        return;
      }

      const inspection = await prisma.inspection.findFirst({
        where: {
          id,
          companyId,
        },
        include: {
          vehicle: {
            select: {
              id: true,
              plate: true,
              brand: true,
              model: true,
              version: true,
              color: true,
              currentMileage: true,
            },
          },
          client: {
            select: {
              id: true,
              name: true,
              cpfCnpj: true,
              phone: true,
              email: true,
            },
          },
          rental: {
            select: {
              id: true,
              rentalNumber: true,
              codigoContrato: true,
              startDate: true,
              endDate: true,
              actualEndDate: true,
              status: true,
              initialMileage: true,
              finalMileage: true,
              initialFuelLevel: true,
              finalFuelLevel: true,
            },
          },
        },
      });

      if (!inspection) {
        res.status(404).json({
          error: 'INSPECTION_NOT_FOUND',
          message: 'Vistoria não encontrada.',
        });
        return;
      }

      res.json({
        data: serializeInspection(inspection),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/inspections
   *
   * Cria uma nova vistoria.
   */
  async create(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const companyId = getCompanyId(req);

      if (!companyId) {
        res.status(401).json({
          error: 'COMPANY_NOT_FOUND',
          message: 'Empresa do usuário não identificada.',
        });
        return;
      }

      const {
        type,
        vehicleId,
        rentalId,
        clientId,
        mileage,
        fuelLevel,
        notes,
        items,
        itemsJson,
        photos,
        photosJson,
      } = req.body;

      if (!vehicleId) {
        res.status(400).json({
          error: 'VEHICLE_REQUIRED',
          message: 'O veículo é obrigatório para registrar a vistoria.',
        });
        return;
      }

      if (mileage === undefined || mileage === null || mileage === '') {
        res.status(400).json({
          error: 'MILEAGE_REQUIRED',
          message: 'O KM da vistoria é obrigatório.',
        });
        return;
      }

      const mileageNumber = Number(mileage);

      if (!Number.isInteger(mileageNumber) || mileageNumber < 0) {
        res.status(400).json({
          error: 'INVALID_MILEAGE',
          message: 'Informe um KM válido.',
        });
        return;
      }

      const normalizedType = normalizeType(type);

      /**
       * Verifica se o veículo pertence à empresa.
       */
      const vehicle = await prisma.vehicle.findFirst({
        where: {
          id: String(vehicleId),
          companyId,
        },
      });

      if (!vehicle) {
        res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'Veículo não encontrado para esta empresa.',
        });
        return;
      }

      /**
       * Validação da locação, quando informada.
       */
      let rental: any = null;

      if (rentalId) {
        rental = await prisma.rental.findFirst({
          where: {
            id: String(rentalId),
            companyId,
          },
          include: {
            client: true,
          },
        });

        if (!rental) {
          res.status(404).json({
            error: 'RENTAL_NOT_FOUND',
            message: 'Locação não encontrada para esta empresa.',
          });
          return;
        }

        if (rental.vehicleId !== vehicle.id) {
          res.status(400).json({
            error: 'RENTAL_VEHICLE_MISMATCH',
            message: 'O veículo informado não pertence à locação selecionada.',
          });
          return;
        }

        /**
         * Se não foi informado cliente, usamos o cliente da locação.
         */
        if (!clientId && rental.clientId) {
          req.body.clientId = rental.clientId;
        }
      }

      /**
       * Validação do cliente, quando informado.
       */
      let normalizedClientId: string | null =
        clientId ? String(clientId) : null;

      if (!normalizedClientId && rental?.clientId) {
        normalizedClientId = rental.clientId;
      }

      if (normalizedClientId) {
        const client = await prisma.client.findFirst({
          where: {
            id: normalizedClientId,
            companyId,
          },
        });

        if (!client) {
          res.status(404).json({
            error: 'CLIENT_NOT_FOUND',
            message: 'Cliente não encontrado para esta empresa.',
          });
          return;
        }
      }

      /**
       * Não permitimos registrar KM inferior ao KM atual
       * do veículo.
       */
      if (mileageNumber < vehicle.currentMileage) {
        res.status(400).json({
          error: 'INVALID_MILEAGE',
          message: `O KM informado (${mileageNumber}) não pode ser inferior ao KM atual do veículo (${vehicle.currentMileage}).`,
        });
        return;
      }

      const normalizedItems = normalizeJsonField(
        items !== undefined ? items : itemsJson
      );

      const normalizedPhotos = normalizeJsonField(
        photos !== undefined ? photos : photosJson
      );

      const inspection = await prisma.$transaction(async (tx) => {
        const created = await tx.inspection.create({
          data: {
            companyId,
            vehicleId: vehicle.id,
            rentalId: rentalId ? String(rentalId) : null,
            clientId: normalizedClientId,
            type: normalizedType,
            mileage: mileageNumber,
            fuelLevel: fuelLevel
              ? String(fuelLevel).toUpperCase()
              : 'FULL',
            notes: notes
              ? String(notes).trim()
              : null,
            itemsJson: normalizedItems,
            photosJson: normalizedPhotos,
          },
          include: {
            vehicle: {
              select: {
                id: true,
                plate: true,
                brand: true,
                model: true,
                color: true,
                currentMileage: true,
              },
            },
            client: {
              select: {
                id: true,
                name: true,
                cpfCnpj: true,
                phone: true,
              },
            },
            rental: {
              select: {
                id: true,
                rentalNumber: true,
                codigoContrato: true,
                startDate: true,
                endDate: true,
                status: true,
              },
            },
          },
        });

        /**
         * Atualiza o KM atual do veículo quando a vistoria
         * tiver KM superior ao registrado.
         */
        if (mileageNumber > vehicle.currentMileage) {
          await tx.vehicle.update({
            where: {
              id: vehicle.id,
            },
            data: {
              currentMileage: mileageNumber,
            },
          });

          await tx.vehicleMileage.create({
            data: {
              vehicleId: vehicle.id,
              mileage: mileageNumber,
              type:
                normalizedType === 'CHECKOUT'
                  ? 'RENTAL_START'
                  : 'RENTAL_END',
              notes: `VISTORIA ${
                normalizedType === 'CHECKOUT'
                  ? 'DE SAÍDA'
                  : 'DE DEVOLUÇÃO'
              }`,
              createdBy: req.user?.userId || null,
            },
          });
        }

        /**
         * Atualiza informações da locação quando houver
         * uma vistoria vinculada.
         */
        if (rentalId) {
          if (normalizedType === 'CHECKOUT') {
            await tx.rental.update({
              where: {
                id: String(rentalId),
              },
              data: {
                initialMileage: mileageNumber,
                initialFuelLevel: fuelLevel
                  ? String(fuelLevel).toUpperCase()
                  : 'FULL',
              },
            });
          }

          if (normalizedType === 'CHECKIN') {
            await tx.rental.update({
              where: {
                id: String(rentalId),
              },
              data: {
                finalMileage: mileageNumber,
                finalFuelLevel: fuelLevel
                  ? String(fuelLevel).toUpperCase()
                  : null,
              },
            });
          }
        }

        /**
         * Auditoria.
         *
         * Alguns projetos possuem AuditLog com estrutura
         * diferente. Para não impedir a criação da vistoria
         * caso o modelo de auditoria tenha sido alterado,
         * fazemos a tentativa de forma isolada.
         */
        try {
          await tx.auditLog.create({
            data: {
              companyId,
              userId: req.user?.userId || null,
              action: 'CREATE',
              entity: 'INSPECTION',
              entityId: created.id,
              oldData: null,
              newData: JSON.stringify({
                type: normalizedType,
                vehicleId: vehicle.id,
                rentalId: rentalId ? String(rentalId) : null,
                clientId: normalizedClientId,
                mileage: mileageNumber,
              }),
            } as any,
          });
        } catch {
          // A vistoria já foi criada; auditoria não deve bloquear
          // a operação caso o schema de AuditLog seja diferente.
        }

        return created;
      });

      res.status(201).json({
        message: 'Vistoria registrada com sucesso!',
        data: serializeInspection(inspection),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/inspections/:id
   */
  async update(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const companyId = getCompanyId(req);
      const { id } = req.params;

      if (!companyId) {
        res.status(401).json({
          error: 'COMPANY_NOT_FOUND',
          message: 'Empresa do usuário não identificada.',
        });
        return;
      }

      const existing = await prisma.inspection.findFirst({
        where: {
          id,
          companyId,
        },
      });

      if (!existing) {
        res.status(404).json({
          error: 'INSPECTION_NOT_FOUND',
          message: 'Vistoria não encontrada.',
        });
        return;
      }

      const {
        type,
        vehicleId,
        rentalId,
        clientId,
        mileage,
        fuelLevel,
        notes,
        items,
        itemsJson,
        photos,
        photosJson,
      } = req.body;

      let normalizedType = existing.type;

      if (type !== undefined) {
        normalizedType = normalizeType(type);
      }

      let normalizedVehicleId = existing.vehicleId;

      if (vehicleId !== undefined && vehicleId !== '') {
        normalizedVehicleId = String(vehicleId);
      }

      const vehicle = await prisma.vehicle.findFirst({
        where: {
          id: normalizedVehicleId,
          companyId,
        },
      });

      if (!vehicle) {
        res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'Veículo não encontrado para esta empresa.',
        });
        return;
      }

      let normalizedRentalId =
        rentalId !== undefined
          ? rentalId
            ? String(rentalId)
            : null
          : existing.rentalId;

      let normalizedClientId =
        clientId !== undefined
          ? clientId
            ? String(clientId)
            : null
          : existing.clientId;

      if (normalizedRentalId) {
        const rental = await prisma.rental.findFirst({
          where: {
            id: normalizedRentalId,
            companyId,
          },
        });

        if (!rental) {
          res.status(404).json({
            error: 'RENTAL_NOT_FOUND',
            message: 'Locação não encontrada para esta empresa.',
          });
          return;
        }

        if (rental.vehicleId !== normalizedVehicleId) {
          res.status(400).json({
            error: 'RENTAL_VEHICLE_MISMATCH',
            message: 'O veículo não pertence à locação selecionada.',
          });
          return;
        }

        if (!normalizedClientId) {
          normalizedClientId = rental.clientId;
        }
      }

      if (normalizedClientId) {
        const client = await prisma.client.findFirst({
          where: {
            id: normalizedClientId,
            companyId,
          },
        });

        if (!client) {
          res.status(404).json({
            error: 'CLIENT_NOT_FOUND',
            message: 'Cliente não encontrado para esta empresa.',
          });
          return;
        }
      }

      let normalizedMileage = existing.mileage;

      if (mileage !== undefined && mileage !== '') {
        normalizedMileage = Number(mileage);

        if (
          !Number.isInteger(normalizedMileage) ||
          normalizedMileage < 0
        ) {
          res.status(400).json({
            error: 'INVALID_MILEAGE',
            message: 'Informe um KM válido.',
          });
          return;
        }
      }

      const normalizedItems =
        items !== undefined || itemsJson !== undefined
          ? normalizeJsonField(
              items !== undefined ? items : itemsJson
            )
          : existing.itemsJson;

      const normalizedPhotos =
        photos !== undefined || photosJson !== undefined
          ? normalizeJsonField(
              photos !== undefined ? photos : photosJson
            )
          : existing.photosJson;

      const updated = await prisma.$transaction(async (tx) => {
        const inspection = await tx.inspection.update({
          where: {
            id: existing.id,
          },
          data: {
            type: normalizedType,
            vehicleId: normalizedVehicleId,
            rentalId: normalizedRentalId,
            clientId: normalizedClientId,
            mileage: normalizedMileage,
            fuelLevel:
              fuelLevel !== undefined
                ? String(fuelLevel).toUpperCase()
                : existing.fuelLevel,
            notes:
              notes !== undefined
                ? notes
                  ? String(notes).trim()
                  : null
                : existing.notes,
            itemsJson: normalizedItems,
            photosJson: normalizedPhotos,
          },
          include: {
            vehicle: {
              select: {
                id: true,
                plate: true,
                brand: true,
                model: true,
                color: true,
                currentMileage: true,
              },
            },
            client: {
              select: {
                id: true,
                name: true,
                cpfCnpj: true,
                phone: true,
              },
            },
            rental: {
              select: {
                id: true,
                rentalNumber: true,
                codigoContrato: true,
                startDate: true,
                endDate: true,
                status: true,
              },
            },
          },
        });

        /**
         * Sincroniza KM somente quando for superior ao atual.
         */
        if (normalizedMileage > vehicle.currentMileage) {
          await tx.vehicle.update({
            where: {
              id: vehicle.id,
            },
            data: {
              currentMileage: normalizedMileage,
            },
          });
        }

        /**
         * Sincroniza dados da locação.
         */
        if (normalizedRentalId) {
          if (normalizedType === 'CHECKOUT') {
            await tx.rental.update({
              where: {
                id: normalizedRentalId,
              },
              data: {
                initialMileage: normalizedMileage,
                initialFuelLevel:
                  fuelLevel !== undefined
                    ? String(fuelLevel).toUpperCase()
                    : existing.fuelLevel,
              },
            });
          }

          if (normalizedType === 'CHECKIN') {
            await tx.rental.update({
              where: {
                id: normalizedRentalId,
              },
              data: {
                finalMileage: normalizedMileage,
                finalFuelLevel:
                  fuelLevel !== undefined
                    ? String(fuelLevel).toUpperCase()
                    : existing.fuelLevel,
              },
            });
          }
        }

        try {
          await tx.auditLog.create({
            data: {
              companyId,
              userId: req.user?.userId || null,
              action: 'UPDATE',
              entity: 'INSPECTION',
              entityId: existing.id,
              oldData: JSON.stringify({
                type: existing.type,
                vehicleId: existing.vehicleId,
                rentalId: existing.rentalId,
                mileage: existing.mileage,
              }),
              newData: JSON.stringify({
                type: normalizedType,
                vehicleId: normalizedVehicleId,
                rentalId: normalizedRentalId,
                mileage: normalizedMileage,
              }),
            } as any,
          });
        } catch {
          // Não bloquear atualização por falha de auditoria.
        }

        return inspection;
      });

      res.json({
        message: 'Vistoria atualizada com sucesso!',
        data: serializeInspection(updated),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/inspections/:id
   */
  async delete(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const companyId = getCompanyId(req);
      const { id } = req.params;

      if (!companyId) {
        res.status(401).json({
          error: 'COMPANY_NOT_FOUND',
          message: 'Empresa do usuário não identificada.',
        });
        return;
      }

      const inspection = await prisma.inspection.findFirst({
        where: {
          id,
          companyId,
        },
      });

      if (!inspection) {
        res.status(404).json({
          error: 'INSPECTION_NOT_FOUND',
          message: 'Vistoria não encontrada.',
        });
        return;
      }

      await prisma.$transaction(async (tx) => {
        await tx.inspection.delete({
          where: {
            id: inspection.id,
          },
        });

        try {
          await tx.auditLog.create({
            data: {
              companyId,
              userId: req.user?.userId || null,
              action: 'DELETE',
              entity: 'INSPECTION',
              entityId: inspection.id,
              oldData: JSON.stringify({
                type: inspection.type,
                vehicleId: inspection.vehicleId,
                rentalId: inspection.rentalId,
                clientId: inspection.clientId,
                mileage: inspection.mileage,
              }),
              newData: null,
            } as any,
          });
        } catch {
          // Não bloquear exclusão por falha de auditoria.
        }
      });

      res.json({
        message: 'Vistoria excluída com sucesso!',
        data: {
          id: inspection.id,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const inspectionsController = new InspectionsController();
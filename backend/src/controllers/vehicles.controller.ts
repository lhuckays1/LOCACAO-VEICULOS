import { Response, NextFunction } from 'express';
import { db, generateUUID, Vehicle } from '../db/store.js';
import { vehicleSchema } from '../schemas/index.js';
import { unmask } from '../utils/formatters.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class VehiclesController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { search, status, category } = req.query;

      let vehicles = db.vehicles.filter((v) => v.companyId === companyId);

      if (status && typeof status === 'string' && status !== 'ALL') {
        vehicles = vehicles.filter((v) => v.status === status);
      }

      if (category && typeof category === 'string' && category !== 'ALL') {
        vehicles = vehicles.filter((v) => v.category.toUpperCase() === category.toUpperCase());
      }

      if (search && typeof search === 'string') {
        const query = search.trim().toUpperCase();
        const unmaskedQuery = unmask(query);

        vehicles = vehicles.filter((v) => {
          return (
            v.plate.includes(unmaskedQuery) ||
            v.brand.toUpperCase().includes(query) ||
            v.model.toUpperCase().includes(query) ||
            (v.renavam && v.renavam.includes(unmaskedQuery)) ||
            (v.tracker && v.tracker.toUpperCase().includes(query))
          );
        });
      }

      // Sort newest created first
      vehicles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Enrich with active rental info if rented
      const enrichedVehicles = vehicles.map((v) => {
        let activeRentalInfo = null;
        if (v.status === 'RENTED') {
          const rental = db.rentals.find((r) => r.vehicleId === v.id && r.status === 'ACTIVE');
          if (rental) {
            const client = db.clients.find((c) => c.id === rental.clientId);
            activeRentalInfo = {
              rentalId: rental.id,
              rentalNumber: rental.rentalNumber,
              clientName: client ? client.name : 'N/A',
              startDate: rental.startDate,
              endDate: rental.endDate,
              amount: rental.amount,
            };
          }
        }
        return {
          ...v,
          activeRental: activeRentalInfo,
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

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const vehicle = db.vehicles.find((v) => v.id === id && v.companyId === companyId);
      if (!vehicle) {
        res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'Veículo não encontrado.',
        });
        return;
      }

      const vehicleRentals = db.rentals
        .filter((r) => r.vehicleId === vehicle.id && r.companyId === companyId)
        .map((r) => {
          const client = db.clients.find((c) => c.id === r.clientId);
          return {
            ...r,
            client: client
              ? {
                  id: client.id,
                  name: client.name,
                  cpfCnpj: client.cpfCnpj,
                  phone: client.phone,
                }
              : null,
          };
        });

      const vehicleMaintenances = db.maintenances.filter(
        (m) => m.vehicleId === vehicle.id && m.companyId === companyId
      );

      const vehicleMileages = db.vehicleMileages.filter((vm) => vm.vehicleId === vehicle.id);

      const vehicleFines = db.fines.filter((f) => f.vehicleId === vehicle.id && f.companyId === companyId);

      const vehicleExpenses = db.expenses.filter((e) => e.vehicleId === vehicle.id && e.companyId === companyId);

      res.json({
        data: {
          ...vehicle,
          rentals: vehicleRentals,
          maintenances: vehicleMaintenances,
          mileageLogs: vehicleMileages,
          fines: vehicleFines,
          expenses: vehicleExpenses,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const data = vehicleSchema.parse(req.body);

      const cleanPlate = data.plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

      // Check unique plate inside company
      const existing = db.vehicles.find(
        (v) => v.companyId === companyId && v.plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanPlate
      );

      if (existing) {
        res.status(409).json({
          error: 'PLATE_ALREADY_EXISTS',
          message: `Já existe um veículo cadastrado com a placa ${cleanPlate} nesta empresa.`,
        });
        return;
      }

      const now = new Date().toISOString();
      const vehicleId = generateUUID();

      const newVehicle: Vehicle = {
        id: vehicleId,
        companyId,
        plate: cleanPlate,
        brand: data.brand.toUpperCase(),
        model: data.model.toUpperCase(),
        version: data.version ? data.version.toUpperCase() : null,
        manufactureYear: data.manufactureYear,
        modelYear: data.modelYear,
        color: data.color.toUpperCase(),
        fuel: data.fuel.toUpperCase(),
        category: data.category.toUpperCase(),
        vehicleType: data.vehicleType ? data.vehicleType.toUpperCase() : 'CARRO',
        currentMileage: data.currentMileage || 0,
        status: data.status || 'AVAILABLE',
        renavam: data.renavam ? unmask(data.renavam) : null,
        chassis: data.chassis ? data.chassis.toUpperCase() : null,
        engine: data.engine ? data.engine.toUpperCase() : null,
        power: data.power ? data.power.toUpperCase() : null,
        displacement: data.displacement ? data.displacement.toUpperCase() : null,
        passengerCapacity: data.passengerCapacity || null,
        purchaseValue: data.purchaseValue || null,
        purchaseDate: data.purchaseDate || null,
        dailyRate: data.dailyRate,
        weeklyRate: data.weeklyRate,
        biweeklyRate: data.biweeklyRate || null,
        monthlyRate: data.monthlyRate,
        mileageAllowance: data.mileageAllowance || 0,
        excessMileageRate: data.excessMileageRate || 0.50,
        nextMaintenanceDate: data.nextMaintenanceDate || null,
        insuranceProvider: data.insuranceProvider ? data.insuranceProvider.toUpperCase() : null,
        insuranceExpiration: data.insuranceExpiration || null,
        tracker: data.tracker ? data.tracker.toUpperCase() : null,
        notes: data.notes ? data.notes.toUpperCase() : null,
        createdAt: now,
        updatedAt: now,
      };

      db.vehicles.push(newVehicle);

      // Create initial Mileage log
      db.vehicleMileages.push({
        id: generateUUID(),
        vehicleId: newVehicle.id,
        mileage: newVehicle.currentMileage,
        date: now,
        type: 'MANUAL',
        notes: 'QUILOMETRAGEM INICIAL DE CADASTRO NO SISTEMA',
        createdBy: req.user!.name,
        createdAt: now,
        updatedAt: now,
      });

      db.createAuditLog(companyId, req.user!.userId, 'CREATE', 'VEHICLE', newVehicle.id, null, {
        plate: newVehicle.plate,
        model: newVehicle.model,
      });

      res.status(201).json({
        message: 'Veículo cadastrado com sucesso!',
        data: newVehicle,
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const data = vehicleSchema.parse(req.body);

      const vehicleIndex = db.vehicles.findIndex((v) => v.id === id && v.companyId === companyId);
      if (vehicleIndex === -1) {
        res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'Veículo não encontrado.',
        });
        return;
      }

      const existingVehicle = db.vehicles[vehicleIndex];
      const cleanPlate = data.plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

      // Check unique plate conflict
      const conflict = db.vehicles.find(
        (v) =>
          v.companyId === companyId &&
          v.id !== id &&
          v.plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanPlate
      );

      if (conflict) {
        res.status(409).json({
          error: 'PLATE_ALREADY_EXISTS',
          message: `Outro veículo já está cadastrado com a placa ${cleanPlate}.`,
        });
        return;
      }

      // Validate mileage cannot decrease
      if (data.currentMileage < existingVehicle.currentMileage) {
        res.status(400).json({
          error: 'INVALID_MILEAGE',
          message: `A quilometragem informada (${data.currentMileage} km) não pode ser inferior à quilometragem registrada atual (${existingVehicle.currentMileage} km).`,
        });
        return;
      }

      // If mileage increased, create mileage log
      if (data.currentMileage > existingVehicle.currentMileage) {
        db.vehicleMileages.push({
          id: generateUUID(),
          vehicleId: existingVehicle.id,
          mileage: data.currentMileage,
          date: new Date().toISOString(),
          type: 'MANUAL',
          notes: 'ATUALIZAÇÃO MANUAL DE QUILOMETRAGEM',
          createdBy: req.user!.name,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      const updatedVehicle: Vehicle = {
        ...existingVehicle,
        plate: cleanPlate,
        brand: data.brand.toUpperCase(),
        model: data.model.toUpperCase(),
        version: data.version ? data.version.toUpperCase() : null,
        manufactureYear: data.manufactureYear,
        modelYear: data.modelYear,
        color: data.color.toUpperCase(),
        fuel: data.fuel.toUpperCase(),
        category: data.category.toUpperCase(),
        vehicleType: data.vehicleType ? data.vehicleType.toUpperCase() : (existingVehicle.vehicleType || 'CARRO'),
        currentMileage: data.currentMileage,
        status: data.status,
        renavam: data.renavam ? unmask(data.renavam) : null,
        chassis: data.chassis ? data.chassis.toUpperCase() : null,
        engine: data.engine ? data.engine.toUpperCase() : null,
        power: data.power ? data.power.toUpperCase() : null,
        displacement: data.displacement ? data.displacement.toUpperCase() : null,
        passengerCapacity: data.passengerCapacity !== undefined ? data.passengerCapacity : (existingVehicle.passengerCapacity || null),
        purchaseValue: data.purchaseValue || null,
        purchaseDate: data.purchaseDate || null,
        dailyRate: data.dailyRate,
        weeklyRate: data.weeklyRate,
        biweeklyRate: data.biweeklyRate || null,
        monthlyRate: data.monthlyRate,
        mileageAllowance: data.mileageAllowance,
        excessMileageRate: data.excessMileageRate,
        nextMaintenanceDate: data.nextMaintenanceDate || null,
        insuranceProvider: data.insuranceProvider ? data.insuranceProvider.toUpperCase() : null,
        insuranceExpiration: data.insuranceExpiration || null,
        tracker: data.tracker ? data.tracker.toUpperCase() : null,
        notes: data.notes ? data.notes.toUpperCase() : null,
        updatedAt: new Date().toISOString(),
      };

      db.vehicles[vehicleIndex] = updatedVehicle;

      db.createAuditLog(
        companyId,
        req.user!.userId,
        'UPDATE',
        'VEHICLE',
        updatedVehicle.id,
        existingVehicle,
        updatedVehicle
      );

      res.json({
        message: 'Veículo atualizado com sucesso!',
        data: updatedVehicle,
      });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const vehicle = db.vehicles.find((v) => v.id === id && v.companyId === companyId);
      if (!vehicle) {
        res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'Veículo não encontrado.',
        });
        return;
      }

      if (vehicle.status === 'RENTED') {
        res.status(400).json({
          error: 'VEHICLE_CURRENTLY_RENTED',
          message: 'Não é possível excluir um veículo com locação ativa em andamento.',
        });
        return;
      }

      vehicle.status = 'SOLD';
      vehicle.updatedAt = new Date().toISOString();

      db.createAuditLog(companyId, req.user!.userId, 'STATUS_CHANGE', 'VEHICLE', vehicle.id, null, {
        status: 'SOLD',
      });

      res.json({
        message: 'Veículo marcado como vendido/inativado.',
        data: vehicle,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const vehiclesController = new VehiclesController();

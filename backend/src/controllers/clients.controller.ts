import { Response, NextFunction } from 'express';
import { db, generateUUID, Client } from '../db/store.js';
import { clientSchema } from '../schemas/index.js';
import { unmask } from '../utils/formatters.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class ClientsController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { search, type, active } = req.query;

      let clients = db.clients.filter((c) => c.companyId === companyId);

      if (active !== undefined && active !== '') {
        const isActive = active === 'true';
        clients = clients.filter((c) => c.active === isActive);
      }

      if (type && (type === 'PF' || type === 'PJ')) {
        clients = clients.filter((c) => c.type === type);
      }

      if (search && typeof search === 'string') {
        const query = search.trim().toUpperCase();
        const unmaskedQuery = unmask(query);

        clients = clients.filter((c) => {
          return (
            c.name.toUpperCase().includes(query) ||
            c.cpfCnpj.includes(unmaskedQuery) ||
            c.email.toLowerCase().includes(query.toLowerCase()) ||
            c.phone.includes(unmaskedQuery) ||
            c.city.toUpperCase().includes(query)
          );
        });
      }

      // Sort by newest first
      clients.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Enrich with rental counts
      const enrichedClients = clients.map((c) => {
        const clientRentals = db.rentals.filter((r) => r.clientId === c.id);
        const activeRentals = clientRentals.filter((r) => r.status === 'ACTIVE').length;
        const totalRentals = clientRentals.length;
        return {
          ...c,
          activeRentalsCount: activeRentals,
          totalRentalsCount: totalRentals,
        };
      });

      res.json({
        total: enrichedClients.length,
        data: enrichedClients,
      });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const client = db.clients.find((c) => c.id === id && c.companyId === companyId);
      if (!client) {
        res.status(404).json({
          error: 'CLIENT_NOT_FOUND',
          message: 'Cliente não encontrado.',
        });
        return;
      }

      const clientRentals = db.rentals
        .filter((r) => r.clientId === client.id && r.companyId === companyId)
        .map((r) => {
          const vehicle = db.vehicles.find((v) => v.id === r.vehicleId);
          return {
            ...r,
            vehicle: vehicle
              ? {
                  id: vehicle.id,
                  plate: vehicle.plate,
                  brand: vehicle.brand,
                  model: vehicle.model,
                  category: vehicle.category,
                }
              : null,
          };
        });

      const clientFines = db.fines.filter((f) => f.clientId === client.id && f.companyId === companyId);
      const clientPayments = db.payments.filter((p) => {
        const rental = db.rentals.find((r) => r.id === p.rentalId);
        return rental && rental.clientId === client.id;
      });

      res.json({
        data: {
          ...client,
          rentals: clientRentals,
          fines: clientFines,
          payments: clientPayments,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const data = clientSchema.parse(req.body);

      const unmaskedDoc = unmask(data.cpfCnpj);

      // Check unique CPF/CNPJ inside this company
      const existing = db.clients.find(
        (c) => c.companyId === companyId && unmask(c.cpfCnpj) === unmaskedDoc
      );

      if (existing) {
        res.status(409).json({
          error: 'DOCUMENT_ALREADY_EXISTS',
          message: `Já existe um cliente cadastrado com este ${data.type === 'PJ' ? 'CNPJ' : 'CPF'}.`,
        });
        return;
      }

      const now = new Date().toISOString();
      const newClient: Client = {
        id: generateUUID(),
        companyId,
        type: data.type,
        name: data.name.toUpperCase(),
        cpfCnpj: unmaskedDoc,
        rg: data.rg ? data.rg.toUpperCase() : null,
        birthDate: data.birthDate || null,
        phone: unmask(data.phone),
        whatsapp: data.whatsapp ? unmask(data.whatsapp) : null,
        email: data.email.toLowerCase(),
        zipCode: unmask(data.zipCode),
        street: data.street.toUpperCase(),
        number: data.number.toUpperCase(),
        complement: data.complement ? data.complement.toUpperCase() : null,
        neighborhood: data.neighborhood.toUpperCase(),
        city: data.city.toUpperCase(),
        state: data.state.toUpperCase(),
        driverLicense: data.driverLicense ? unmask(data.driverLicense) : null,
        driverLicenseCategory: data.driverLicenseCategory ? data.driverLicenseCategory.toUpperCase() : null,
        driverLicenseExpiration: data.driverLicenseExpiration || null,
        active: data.active !== undefined ? data.active : true,
        notes: data.notes ? data.notes.toUpperCase() : null,
        createdAt: now,
        updatedAt: now,
      };

      db.clients.push(newClient);

      db.createAuditLog(companyId, req.user!.userId, 'CREATE', 'CLIENT', newClient.id, null, {
        name: newClient.name,
        document: newClient.cpfCnpj,
      });

      res.status(201).json({
        message: 'Cliente cadastrado com sucesso!',
        data: newClient,
      });
    } catch (err) {
      next(err);
    }
  }

  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const data = clientSchema.parse(req.body);

      const clientIndex = db.clients.findIndex((c) => c.id === id && c.companyId === companyId);
      if (clientIndex === -1) {
        res.status(404).json({
          error: 'CLIENT_NOT_FOUND',
          message: 'Cliente não encontrado para atualização.',
        });
        return;
      }

      const existingClient = db.clients[clientIndex];
      const unmaskedDoc = unmask(data.cpfCnpj);

      // Check unique document conflict with another client
      const conflict = db.clients.find(
        (c) => c.companyId === companyId && c.id !== id && unmask(c.cpfCnpj) === unmaskedDoc
      );

      if (conflict) {
        res.status(409).json({
          error: 'DOCUMENT_ALREADY_EXISTS',
          message: `Outro cliente já possui este ${data.type === 'PJ' ? 'CNPJ' : 'CPF'}.`,
        });
        return;
      }

      const updatedClient: Client = {
        ...existingClient,
        type: data.type,
        name: data.name.toUpperCase(),
        cpfCnpj: unmaskedDoc,
        rg: data.rg ? data.rg.toUpperCase() : null,
        birthDate: data.birthDate || null,
        phone: unmask(data.phone),
        whatsapp: data.whatsapp ? unmask(data.whatsapp) : null,
        email: data.email.toLowerCase(),
        zipCode: unmask(data.zipCode),
        street: data.street.toUpperCase(),
        number: data.number.toUpperCase(),
        complement: data.complement ? data.complement.toUpperCase() : null,
        neighborhood: data.neighborhood.toUpperCase(),
        city: data.city.toUpperCase(),
        state: data.state.toUpperCase(),
        driverLicense: data.driverLicense ? unmask(data.driverLicense) : null,
        driverLicenseCategory: data.driverLicenseCategory ? data.driverLicenseCategory.toUpperCase() : null,
        driverLicenseExpiration: data.driverLicenseExpiration || null,
        active: data.active !== undefined ? data.active : existingClient.active,
        notes: data.notes ? data.notes.toUpperCase() : null,
        updatedAt: new Date().toISOString(),
      };

      db.clients[clientIndex] = updatedClient;

      db.createAuditLog(
        companyId,
        req.user!.userId,
        'UPDATE',
        'CLIENT',
        updatedClient.id,
        existingClient,
        updatedClient
      );

      res.json({
        message: 'Cliente atualizado com sucesso!',
        data: updatedClient,
      });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const client = db.clients.find((c) => c.id === id && c.companyId === companyId);
      if (!client) {
        res.status(404).json({
          error: 'CLIENT_NOT_FOUND',
          message: 'Cliente não encontrado.',
        });
        return;
      }

      // Check if client has active rentals
      const activeRentals = db.rentals.filter(
        (r) => r.clientId === id && r.companyId === companyId && r.status === 'ACTIVE'
      );

      if (activeRentals.length > 0) {
        res.status(400).json({
          error: 'CLIENT_HAS_ACTIVE_RENTALS',
          message: 'Não é possível desativar ou excluir um cliente com locações ativas.',
        });
        return;
      }

      // Soft delete
      client.active = false;
      client.updatedAt = new Date().toISOString();

      db.createAuditLog(companyId, req.user!.userId, 'DEACTIVATE', 'CLIENT', client.id);

      res.json({
        message: 'Cliente desativado com sucesso.',
        data: client,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const clientsController = new ClientsController();

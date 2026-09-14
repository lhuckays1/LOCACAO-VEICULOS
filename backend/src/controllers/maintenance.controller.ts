import { Response, NextFunction } from 'express';
import {
  db,
  generateUUID,
  Maintenance,
  MaintenanceService,
  MaintenancePart,
  MaintenancePlan,
  Workshop,
  Supplier,
  Vehicle,
} from '../db/store.js';
import {
  createMaintenanceSchema,
  updateMaintenanceSchema,
  completeMaintenanceSchema,
  maintenanceServiceSchema,
  maintenancePartSchema,
  maintenancePlanSchema,
  workshopSchema,
  supplierSchema,
} from '../schemas/maintenance.schema.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class MaintenanceController {
  /**
   * Helper to enrich maintenance with related details
   */
  private enrichMaintenance(m: Maintenance, companyId: string) {
    const vehicle = db.vehicles.find((v) => v.id === m.vehicleId && v.companyId === companyId);
    const workshopRef = m.workshopId ? db.workshops.find((w) => w.id === m.workshopId) : null;
    const supplierRef = m.supplierId ? db.suppliers.find((s) => s.id === m.supplierId) : null;
    const services = db.maintenanceServices.filter((s) => s.maintenanceId === m.id);
    const parts = db.maintenanceParts.filter((p) => p.maintenanceId === m.id);
    const financialTx = m.financialTransactionId
      ? db.financialTransactions.find((t) => t.id === m.financialTransactionId)
      : db.financialTransactions.find((t) => t.maintenanceId === m.id);

    return {
      ...m,
      vehicle: vehicle
        ? {
            id: vehicle.id,
            plate: vehicle.plate,
            brand: vehicle.brand,
            model: vehicle.model,
            version: vehicle.version,
            currentMileage: vehicle.currentMileage,
            status: vehicle.status,
            color: vehicle.color,
          }
        : null,
      workshopRef: workshopRef
        ? {
            id: workshopRef.id,
            nome: workshopRef.nome,
            telefone: workshopRef.telefone,
            email: workshopRef.email,
            cidade: workshopRef.cidade,
            uf: workshopRef.uf,
          }
        : null,
      supplierRef: supplierRef
        ? {
            id: supplierRef.id,
            nome: supplierRef.nome,
            tipo: supplierRef.tipo,
            telefone: supplierRef.telefone,
          }
        : null,
      servicesCount: services.length,
      partsCount: parts.length,
      financialTransaction: financialTx
        ? {
            id: financialTx.id,
            status: financialTx.status,
            grossAmount: financialTx.grossAmount,
            netAmount: financialTx.netAmount,
            paidAmount: financialTx.paidAmount,
            remainingAmount: financialTx.remainingAmount,
            dueDate: financialTx.dueDate,
          }
        : null,
    };
  }

  /**
   * GET /api/maintenance
   * List maintenances with comprehensive filtering
   */
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const {
        status,
        type,
        vehicleId,
        workshopId,
        supplierId,
        search,
        startDate,
        endDate,
      } = req.query;

      let list = db.maintenances.filter(
        (m) => m.companyId === companyId || m.tenantId === companyId
      );

      if (status && typeof status === 'string' && status !== 'ALL') {
        list = list.filter((m) => m.status === status);
      }

      if (type && typeof type === 'string' && type !== 'ALL') {
        list = list.filter((m) => m.type === type);
      }

      if (vehicleId && typeof vehicleId === 'string') {
        list = list.filter((m) => m.vehicleId === vehicleId);
      }

      if (workshopId && typeof workshopId === 'string') {
        list = list.filter((m) => m.workshopId === workshopId);
      }

      if (supplierId && typeof supplierId === 'string') {
        list = list.filter((m) => m.supplierId === supplierId);
      }

      if (startDate && typeof startDate === 'string') {
        list = list.filter((m) => m.dataAgendamento >= startDate);
      }

      if (endDate && typeof endDate === 'string') {
        list = list.filter((m) => m.dataAgendamento <= endDate);
      }

      if (search && typeof search === 'string') {
        const term = search.trim().toUpperCase();
        list = list.filter((m) => {
          const v = db.vehicles.find((veh) => veh.id === m.vehicleId);
          return (
            m.codigo.toUpperCase().includes(term) ||
            m.titulo.toUpperCase().includes(term) ||
            m.descricao.toUpperCase().includes(term) ||
            (v && (v.plate.toUpperCase().includes(term) || v.model.toUpperCase().includes(term))) ||
            (m.workshop && m.workshop.toUpperCase().includes(term))
          );
        });
      }

      // Sort by scheduledDate / createdAt desc
      list.sort((a, b) => new Date(b.dataAgendamento || b.createdAt).getTime() - new Date(a.dataAgendamento || a.createdAt).getTime());

      const enriched = list.map((m) => this.enrichMaintenance(m, companyId));

      res.json({
        data: enriched,
        total: enriched.length,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/maintenance/dashboard
   * Maintenance KPIs and statistics
   */
  async dashboard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const currentYear = `${now.getFullYear()}`;

      const maintenances = db.maintenances.filter(
        (m) => m.companyId === companyId || m.tenantId === companyId
      );

      // Counts by status
      const totalCount = maintenances.length;
      const scheduledCount = maintenances.filter((m) => m.status === 'SCHEDULED').length;
      const inProgressCount = maintenances.filter((m) => m.status === 'IN_PROGRESS').length;
      const waitingPartsCount = maintenances.filter((m) => m.status === 'WAITING_PARTS').length;
      const completedCount = maintenances.filter((m) => m.status === 'COMPLETED').length;
      const cancelledCount = maintenances.filter((m) => m.status === 'CANCELLED').length;

      // Financial costs
      const completedList = maintenances.filter((m) => m.status === 'COMPLETED');
      const totalCost = completedList.reduce((acc, m) => acc + (Number(m.custoTotal) || 0), 0);

      const monthCost = completedList
        .filter((m) => (m.dataConclusao || m.dataAgendamento || '').startsWith(currentMonth))
        .reduce((acc, m) => acc + (Number(m.custoTotal) || 0), 0);

      const yearCost = completedList
        .filter((m) => (m.dataConclusao || m.dataAgendamento || '').startsWith(currentYear))
        .reduce((acc, m) => acc + (Number(m.custoTotal) || 0), 0);

      // Costs by Type
      const costByType: Record<string, number> = {
        PREVENTIVE: 0,
        CORRECTIVE: 0,
        EMERGENCY: 0,
        INSPECTION: 0,
        OIL_CHANGE: 0,
        TIRES: 0,
        BRAKES: 0,
        SUSPENSION: 0,
        ELECTRICAL: 0,
        ENGINE: 0,
        OTHER: 0,
      };

      for (const m of completedList) {
        costByType[m.type] = (costByType[m.type] || 0) + (Number(m.custoTotal) || 0);
      }

      // Top 5 vehicles with highest maintenance cost
      const vehicleCostMap: Record<string, { vehicleId: string; plate: string; model: string; totalCost: number; count: number }> = {};
      for (const m of completedList) {
        const v = db.vehicles.find((veh) => veh.id === m.vehicleId);
        if (!v) continue;
        if (!vehicleCostMap[v.id]) {
          vehicleCostMap[v.id] = {
            vehicleId: v.id,
            plate: v.plate,
            model: `${v.brand} ${v.model}`,
            totalCost: 0,
            count: 0,
          };
        }
        vehicleCostMap[v.id].totalCost += Number(m.custoTotal) || 0;
        vehicleCostMap[v.id].count += 1;
      }

      const topVehicles = Object.values(vehicleCostMap)
        .sort((a, b) => b.totalCost - a.totalCost)
        .slice(0, 5);

      // Alerts count
      const alerts = db.calculateMaintenanceAlerts(companyId);
      const overdueAlertsCount = alerts.filter((a) => a.nivelAlerta === 'VENCIDA').length;
      const upcomingAlertsCount = alerts.filter((a) => a.nivelAlerta === 'PROXIMA').length;
      const attentionAlertsCount = alerts.filter((a) => a.nivelAlerta === 'ATENCAO').length;

      res.json({
        kpis: {
          totalCount,
          scheduledCount,
          inProgressCount,
          waitingPartsCount,
          completedCount,
          cancelledCount,
          totalCost: Math.round(totalCost * 100) / 100,
          monthCost: Math.round(monthCost * 100) / 100,
          yearCost: Math.round(yearCost * 100) / 100,
          overdueAlertsCount,
          upcomingAlertsCount,
          attentionAlertsCount,
          activeAlertsTotal: overdueAlertsCount + upcomingAlertsCount + attentionAlertsCount,
        },
        costByType,
        topVehicles,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/maintenance/alerts
   * Returns calculated KM and Date alerts
   */
  async alerts(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const alerts = db.calculateMaintenanceAlerts(companyId);
      res.json({ data: alerts, total: alerts.length });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/maintenance/:id
   * Get maintenance with full details, parts, services, vehicle and financial transaction
   */
  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const maintenance = db.maintenances.find(
        (m) => (m.id === id || m.codigo === id) && (m.companyId === companyId || m.tenantId === companyId)
      );

      if (!maintenance) {
        res.status(404).json({
          error: 'MAINTENANCE_NOT_FOUND',
          message: 'Ordem de manutenção não encontrada.',
        });
        return;
      }

      const vehicle = db.vehicles.find((v) => v.id === maintenance.vehicleId);
      const workshopRef = maintenance.workshopId ? db.workshops.find((w) => w.id === maintenance.workshopId) : null;
      const supplierRef = maintenance.supplierId ? db.suppliers.find((s) => s.id === maintenance.supplierId) : null;
      const services = db.maintenanceServices.filter((s) => s.maintenanceId === maintenance.id);
      const parts = db.maintenanceParts.filter((p) => p.maintenanceId === maintenance.id);
      const financialTx = maintenance.financialTransactionId
        ? db.financialTransactions.find((t) => t.id === maintenance.financialTransactionId)
        : db.financialTransactions.find((t) => t.maintenanceId === maintenance.id);

      const auditLogs = db.auditLogs.filter(
        (a) => a.entity === 'MAINTENANCE' && a.entityId === maintenance.id
      );

      res.json({
        data: {
          ...maintenance,
          vehicle,
          workshopRef,
          supplierRef,
          services,
          parts,
          financialTransaction: financialTx || null,
          auditLogs,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/maintenance
   * Create new maintenance order
   */
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const data = createMaintenanceSchema.parse(req.body);

      // Check vehicle exists in company
      const vehicle = db.vehicles.find(
        (v) => v.id === data.vehicleId && v.companyId === companyId
      );
      if (!vehicle) {
        res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'Veículo informado não encontrado nesta empresa.',
        });
        return;
      }

      // Check active rental rule if requested status is IN_PROGRESS
      const requestedStatus = data.status || 'SCHEDULED';
      if (requestedStatus === 'IN_PROGRESS') {
        const activeRental = db.rentals.find(
          (r) => r.vehicleId === vehicle.id &&
                 (r.companyId === companyId || r.tenantId === companyId) &&
                 (r.status === 'ACTIVE' || r.status === 'ATIVA')
        );
        if (activeRental || vehicle.status === 'RENTED') {
          res.status(400).json({
            error: 'VEHICLE_HAS_ACTIVE_RENTAL',
            message: `O veículo com placa ${vehicle.plate} está com status ALUGADO ou possui locação ativa (${activeRental?.codigoContrato || 'ATIVA'}). Não é permitido iniciar manutenção em veículos alugados. Realize a devolução do veículo antes de encaminhá-lo à manutenção.`,
          });
          return;
        }
      }

      const now = new Date().toISOString();
      const maintenanceId = generateUUID();
      const codigo = db.generateMaintenanceCode(companyId);

      // Workshop resolution
      let workshopName = '';
      if (data.workshopId) {
        const ws = db.workshops.find((w) => w.id === data.workshopId);
        if (ws) workshopName = ws.nome;
      }

      // Create Services
      let custoMaoDeObra = 0;
      if (data.services && data.services.length > 0) {
        for (const s of data.services) {
          const valorTotal = Math.round(s.quantidade * s.valorUnitario * 100) / 100;
          custoMaoDeObra += valorTotal;
          db.maintenanceServices.push({
            id: generateUUID(),
            maintenanceId,
            descricao: s.descricao.toUpperCase(),
            quantidade: s.quantidade,
            valorUnitario: s.valorUnitario,
            valorTotal,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      // Create Parts
      let custoPecas = 0;
      if (data.parts && data.parts.length > 0) {
        for (const p of data.parts) {
          const valorTotal = Math.round(p.quantidade * p.valorUnitario * 100) / 100;
          custoPecas += valorTotal;
          db.maintenanceParts.push({
            id: generateUUID(),
            maintenanceId,
            nome: p.nome.toUpperCase(),
            codigo: p.codigo ? p.codigo.toUpperCase() : null,
            quantidade: p.quantidade,
            valorUnitario: p.valorUnitario,
            valorTotal,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      const custoOutros = Math.round((Number(data.custoOutros) || 0) * 100) / 100;
      const custoTotal = Math.round((custoMaoDeObra + custoPecas + custoOutros) * 100) / 100;

      const newMaintenance: Maintenance = {
        id: maintenanceId,
        companyId,
        tenantId: companyId,
        codigo,
        vehicleId: vehicle.id,
        type: data.type,
        status: requestedStatus,
        titulo: data.titulo.toUpperCase(),
        descricao: data.descricao.toUpperCase(),
        kmEntrada: data.kmEntrada,
        kmConclusao: null,
        dataAgendamento: data.dataAgendamento,
        dataInicio: requestedStatus === 'IN_PROGRESS' ? now : null,
        dataConclusao: requestedStatus === 'COMPLETED' ? now : null,
        custoPecas,
        custoMaoDeObra,
        custoOutros,
        custoTotal,
        supplierId: data.supplierId || null,
        workshopId: data.workshopId || null,
        workshop: workshopName || null,
        financialTransactionId: null,
        observacoes: data.observacoes ? data.observacoes.toUpperCase() : null,
        createdBy: req.user!.userId,
        createdAt: now,
        updatedAt: now,
        // Legacy
        description: data.descricao.toUpperCase(),
        scheduledDate: data.dataAgendamento,
        mileage: data.kmEntrada,
        cost: custoTotal,
      };

      db.maintenances.push(newMaintenance);

      // If IN_PROGRESS, set vehicle status to MAINTENANCE
      if (requestedStatus === 'IN_PROGRESS') {
        vehicle.status = 'MAINTENANCE';
        vehicle.updatedAt = now;
      }

      // If created as COMPLETED, sync with financial
      if (requestedStatus === 'COMPLETED') {
        if (vehicle.status === 'MAINTENANCE') {
          vehicle.status = 'AVAILABLE';
          vehicle.updatedAt = now;
        }
        db.syncMaintenanceWithFinancial(newMaintenance, vehicle);
      }

      db.createAuditLog(
        companyId,
        req.user!.userId,
        'CREATE',
        'MAINTENANCE',
        maintenanceId,
        null,
        { codigo, vehiclePlate: vehicle.plate, type: data.type, status: requestedStatus, custoTotal }
      );

      res.status(201).json({
        message: `Ordem de manutenção ${codigo} criada com sucesso!`,
        data: this.enrichMaintenance(newMaintenance, companyId),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/maintenance/:id
   * Update maintenance order
   */
  async update(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const data = updateMaintenanceSchema.parse(req.body);

      const maintenance = db.maintenances.find(
        (m) => (m.id === id || m.codigo === id) && (m.companyId === companyId || m.tenantId === companyId)
      );

      if (!maintenance) {
        res.status(404).json({
          error: 'MAINTENANCE_NOT_FOUND',
          message: 'Ordem de manutenção não encontrada.',
        });
        return;
      }

      const vehicle = db.vehicles.find((v) => v.id === maintenance.vehicleId);
      if (!vehicle) {
        res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'Veículo vinculado não encontrado.',
        });
        return;
      }

      const now = new Date().toISOString();
      const oldStatus = maintenance.status;

      // If changing status to IN_PROGRESS, check active rental
      if (data.status === 'IN_PROGRESS' && oldStatus !== 'IN_PROGRESS') {
        const activeRental = db.rentals.find(
          (r) => r.vehicleId === vehicle.id &&
                 (r.companyId === companyId || r.tenantId === companyId) &&
                 (r.status === 'ACTIVE' || r.status === 'ATIVA')
        );
        if (activeRental || vehicle.status === 'RENTED') {
          res.status(400).json({
            error: 'VEHICLE_HAS_ACTIVE_RENTAL',
            message: `O veículo com placa ${vehicle.plate} está com status ALUGADO ou possui locação ativa (${activeRental?.codigoContrato || 'ATIVA'}). Não é permitido iniciar manutenção em veículos alugados.`,
          });
          return;
        }
        vehicle.status = 'MAINTENANCE';
        vehicle.updatedAt = now;
        maintenance.dataInicio = maintenance.dataInicio || now;
      }

      // If changing status to COMPLETED
      if (data.status === 'COMPLETED' && oldStatus !== 'COMPLETED') {
        if (vehicle.status === 'MAINTENANCE') {
          vehicle.status = 'AVAILABLE';
          vehicle.updatedAt = now;
        }
        maintenance.dataConclusao = data.dataConclusao || now;
      }

      if (data.titulo !== undefined) maintenance.titulo = data.titulo.toUpperCase();
      if (data.descricao !== undefined) {
        maintenance.descricao = data.descricao.toUpperCase();
        maintenance.description = maintenance.descricao;
      }
      if (data.type !== undefined) maintenance.type = data.type;
      if (data.status !== undefined) maintenance.status = data.status;
      if (data.kmEntrada !== undefined) maintenance.kmEntrada = data.kmEntrada;
      if (data.kmConclusao !== undefined) maintenance.kmConclusao = data.kmConclusao;
      if (data.dataAgendamento !== undefined) maintenance.dataAgendamento = data.dataAgendamento;
      if (data.dataInicio !== undefined) maintenance.dataInicio = data.dataInicio;
      if (data.dataConclusao !== undefined) maintenance.dataConclusao = data.dataConclusao;
      if (data.workshopId !== undefined) {
        maintenance.workshopId = data.workshopId;
        if (data.workshopId) {
          const ws = db.workshops.find((w) => w.id === data.workshopId);
          maintenance.workshop = ws ? ws.nome : null;
        } else {
          maintenance.workshop = null;
        }
      }
      if (data.supplierId !== undefined) maintenance.supplierId = data.supplierId;
      if (data.custoOutros !== undefined) maintenance.custoOutros = Math.round(data.custoOutros * 100) / 100;
      if (data.observacoes !== undefined) maintenance.observacoes = data.observacoes ? data.observacoes.toUpperCase() : null;

      maintenance.updatedAt = now;

      // Recalculate costs
      db.recalculateMaintenanceCosts(maintenance.id);

      // If COMPLETED, sync financial
      if (maintenance.status === 'COMPLETED') {
        db.syncMaintenanceWithFinancial(maintenance, vehicle);
      }

      db.createAuditLog(
        companyId,
        req.user!.userId,
        'UPDATE',
        'MAINTENANCE',
        maintenance.id,
        { status: oldStatus },
        { status: maintenance.status, custoTotal: maintenance.custoTotal }
      );

      res.json({
        message: 'Ordem de manutenção atualizada com sucesso!',
        data: this.enrichMaintenance(maintenance, companyId),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/maintenance/:id/start
   * Start maintenance order (transition to IN_PROGRESS and vehicle to MAINTENANCE)
   */
  async start(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const maintenance = db.maintenances.find(
        (m) => (m.id === id || m.codigo === id) && (m.companyId === companyId || m.tenantId === companyId)
      );

      if (!maintenance) {
        res.status(404).json({
          error: 'MAINTENANCE_NOT_FOUND',
          message: 'Ordem de manutenção não encontrada.',
        });
        return;
      }

      if (maintenance.status === 'COMPLETED') {
        res.status(400).json({
          error: 'ALREADY_COMPLETED',
          message: 'Esta ordem de manutenção já foi concluída.',
        });
        return;
      }

      if (maintenance.status === 'CANCELLED') {
        res.status(400).json({
          error: 'MAINTENANCE_CANCELLED',
          message: 'Esta ordem de manutenção está cancelada.',
        });
        return;
      }

      const vehicle = db.vehicles.find((v) => v.id === maintenance.vehicleId);
      if (!vehicle) {
        res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'Veículo vinculado não encontrado.',
        });
        return;
      }

      // Check active rental
      const activeRental = db.rentals.find(
        (r) => r.vehicleId === vehicle.id &&
               (r.companyId === companyId || r.tenantId === companyId) &&
               (r.status === 'ACTIVE' || r.status === 'ATIVA')
      );
      if (activeRental || vehicle.status === 'RENTED') {
        res.status(400).json({
          error: 'VEHICLE_HAS_ACTIVE_RENTAL',
          message: `O veículo com placa ${vehicle.plate} está com status ALUGADO ou possui locação ativa (${activeRental?.codigoContrato || 'ATIVA'}). Não é permitido iniciar manutenção em veículos alugados. Realize a devolução do veículo antes.`,
        });
        return;
      }

      const now = new Date().toISOString();
      maintenance.status = 'IN_PROGRESS';
      maintenance.dataInicio = maintenance.dataInicio || now;
      maintenance.updatedAt = now;

      // Update vehicle status
      vehicle.status = 'MAINTENANCE';
      vehicle.updatedAt = now;

      db.createAuditLog(
        companyId,
        req.user!.userId,
        'STATUS_CHANGE',
        'MAINTENANCE',
        maintenance.id,
        { status: 'SCHEDULED' },
        { status: 'IN_PROGRESS', vehiclePlate: vehicle.plate }
      );

      res.json({
        message: `Manutenção ${maintenance.codigo} iniciada com sucesso. O veículo ${vehicle.plate} foi alterado para EM MANUTENÇÃO.`,
        data: this.enrichMaintenance(maintenance, companyId),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/maintenance/:id/complete
   * Complete maintenance: sets vehicle back to AVAILABLE, records KM, generates FinancialTransaction
   */
  async complete(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const data = completeMaintenanceSchema.parse(req.body);

      const maintenance = db.maintenances.find(
        (m) => (m.id === id || m.codigo === id) && (m.companyId === companyId || m.tenantId === companyId)
      );

      if (!maintenance) {
        res.status(404).json({
          error: 'MAINTENANCE_NOT_FOUND',
          message: 'Ordem de manutenção não encontrada.',
        });
        return;
      }

      if (maintenance.status === 'COMPLETED') {
        res.status(400).json({
          error: 'ALREADY_COMPLETED',
          message: 'Esta ordem de manutenção já está concluída.',
        });
        return;
      }

      const vehicle = db.vehicles.find((v) => v.id === maintenance.vehicleId);
      if (!vehicle) {
        res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'Veículo vinculado não encontrado.',
        });
        return;
      }

      if (data.kmConclusao < maintenance.kmEntrada) {
        res.status(400).json({
          error: 'INVALID_KM',
          message: `O KM de conclusão (${data.kmConclusao}) não pode ser inferior ao KM de entrada (${maintenance.kmEntrada}).`,
        });
        return;
      }

      const now = new Date().toISOString();
      const oldStatus = maintenance.status;

      maintenance.status = 'COMPLETED';
      maintenance.kmConclusao = data.kmConclusao;
      maintenance.dataConclusao = data.dataConclusao || now;
      if (data.observacoes) {
        maintenance.observacoes = maintenance.observacoes
          ? `${maintenance.observacoes} | CONCLUSÃO: ${data.observacoes.toUpperCase()}`
          : data.observacoes.toUpperCase();
      }
      maintenance.updatedAt = now;

      // Update vehicle KM if higher
      if (data.kmConclusao > vehicle.currentMileage) {
        vehicle.currentMileage = data.kmConclusao;
      }

      // Revert vehicle status from MAINTENANCE to AVAILABLE (NEVER revert if RENTED)
      if (vehicle.status === 'MAINTENANCE') {
        vehicle.status = 'AVAILABLE';
      }
      vehicle.updatedAt = now;

      // Recalculate costs ensuring services + parts + others are exact
      db.recalculateMaintenanceCosts(maintenance.id);

      // Financial Integration: generate or update expense
      const tx = db.syncMaintenanceWithFinancial(maintenance, vehicle);

      db.createAuditLog(
        companyId,
        req.user!.userId,
        'COMPLETE',
        'MAINTENANCE',
        maintenance.id,
        { status: oldStatus },
        {
          status: 'COMPLETED',
          kmConclusao: data.kmConclusao,
          custoTotal: maintenance.custoTotal,
          financialTransactionId: tx?.id,
        }
      );

      res.json({
        message: `Manutenção ${maintenance.codigo} concluída com sucesso! Veículo liberado como DISPONÍVEL e despesa financeira registrada.`,
        data: this.enrichMaintenance(maintenance, companyId),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/maintenance/:id/cancel
   * Cancel maintenance order
   */
  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const { motivo } = req.body;

      const maintenance = db.maintenances.find(
        (m) => (m.id === id || m.codigo === id) && (m.companyId === companyId || m.tenantId === companyId)
      );

      if (!maintenance) {
        res.status(404).json({
          error: 'MAINTENANCE_NOT_FOUND',
          message: 'Ordem de manutenção não encontrada.',
        });
        return;
      }

      if (maintenance.status === 'COMPLETED') {
        res.status(400).json({
          error: 'CANNOT_CANCEL_COMPLETED',
          message: 'Não é possível cancelar uma ordem de manutenção já concluída.',
        });
        return;
      }

      const vehicle = db.vehicles.find((v) => v.id === maintenance.vehicleId);
      const now = new Date().toISOString();
      const oldStatus = maintenance.status;

      maintenance.status = 'CANCELLED';
      maintenance.observacoes = maintenance.observacoes
        ? `${maintenance.observacoes} | CANCELAMENTO: ${(motivo || 'SEM MOTIVO').toUpperCase()}`
        : `CANCELAMENTO: ${(motivo || 'SEM MOTIVO').toUpperCase()}`;
      maintenance.updatedAt = now;

      // If vehicle was in MAINTENANCE, check if other active maintenances exist
      if (vehicle && vehicle.status === 'MAINTENANCE') {
        const otherActive = db.maintenances.some(
          (m) => m.id !== maintenance.id && m.vehicleId === vehicle.id && m.status === 'IN_PROGRESS'
        );
        if (!otherActive) {
          vehicle.status = 'AVAILABLE';
          vehicle.updatedAt = now;
        }
      }

      // If a pending financial transaction exists, cancel it
      if (maintenance.financialTransactionId) {
        try {
          db.cancelTransaction(maintenance.financialTransactionId, companyId, req.user!.userId, motivo);
        } catch {
          // ignore if already cancelled
        }
      }

      db.createAuditLog(
        companyId,
        req.user!.userId,
        'CANCEL',
        'MAINTENANCE',
        maintenance.id,
        { status: oldStatus },
        { status: 'CANCELLED', motivo }
      );

      res.json({
        message: `Manutenção ${maintenance.codigo} cancelada com sucesso!`,
        data: this.enrichMaintenance(maintenance, companyId),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/maintenance/:id/services
   * Add service to maintenance order
   */
  async addService(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const data = maintenanceServiceSchema.parse(req.body);

      const maintenance = db.maintenances.find(
        (m) => (m.id === id || m.codigo === id) && (m.companyId === companyId || m.tenantId === companyId)
      );

      if (!maintenance) {
        res.status(404).json({
          error: 'MAINTENANCE_NOT_FOUND',
          message: 'Ordem de manutenção não encontrada.',
        });
        return;
      }

      const now = new Date().toISOString();
      const valorTotal = Math.round(data.quantidade * data.valorUnitario * 100) / 100;
      const newService: MaintenanceService = {
        id: generateUUID(),
        maintenanceId: maintenance.id,
        descricao: data.descricao.toUpperCase(),
        quantidade: data.quantidade,
        valorUnitario: data.valorUnitario,
        valorTotal,
        createdAt: now,
        updatedAt: now,
      };

      db.maintenanceServices.push(newService);
      db.recalculateMaintenanceCosts(maintenance.id);

      db.createAuditLog(
        companyId,
        req.user!.userId,
        'ADD_SERVICE',
        'MAINTENANCE',
        maintenance.id,
        null,
        { service: newService.descricao, valorTotal }
      );

      res.status(201).json({
        message: 'Serviço adicionado com sucesso!',
        data: newService,
        maintenance: this.enrichMaintenance(maintenance, companyId),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/maintenance/:id/services/:serviceId
   * Remove service from maintenance order
   */
  async removeService(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id, serviceId } = req.params;

      const maintenance = db.maintenances.find(
        (m) => (m.id === id || m.codigo === id) && (m.companyId === companyId || m.tenantId === companyId)
      );

      if (!maintenance) {
        res.status(404).json({
          error: 'MAINTENANCE_NOT_FOUND',
          message: 'Ordem de manutenção não encontrada.',
        });
        return;
      }

      const index = db.maintenanceServices.findIndex((s) => s.id === serviceId && s.maintenanceId === maintenance.id);
      if (index === -1) {
        res.status(404).json({
          error: 'SERVICE_NOT_FOUND',
          message: 'Serviço não encontrado.',
        });
        return;
      }

      db.maintenanceServices.splice(index, 1);
      db.recalculateMaintenanceCosts(maintenance.id);

      res.json({
        message: 'Serviço removido com sucesso!',
        maintenance: this.enrichMaintenance(maintenance, companyId),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/maintenance/:id/parts
   * Add part to maintenance order
   */
  async addPart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const data = maintenancePartSchema.parse(req.body);

      const maintenance = db.maintenances.find(
        (m) => (m.id === id || m.codigo === id) && (m.companyId === companyId || m.tenantId === companyId)
      );

      if (!maintenance) {
        res.status(404).json({
          error: 'MAINTENANCE_NOT_FOUND',
          message: 'Ordem de manutenção não encontrada.',
        });
        return;
      }

      const now = new Date().toISOString();
      const valorTotal = Math.round(data.quantidade * data.valorUnitario * 100) / 100;
      const newPart: MaintenancePart = {
        id: generateUUID(),
        maintenanceId: maintenance.id,
        nome: data.nome.toUpperCase(),
        codigo: data.codigo ? data.codigo.toUpperCase() : null,
        quantidade: data.quantidade,
        valorUnitario: data.valorUnitario,
        valorTotal,
        createdAt: now,
        updatedAt: now,
      };

      db.maintenanceParts.push(newPart);
      db.recalculateMaintenanceCosts(maintenance.id);

      db.createAuditLog(
        companyId,
        req.user!.userId,
        'ADD_PART',
        'MAINTENANCE',
        maintenance.id,
        null,
        { part: newPart.nome, valorTotal }
      );

      res.status(201).json({
        message: 'Peça adicionada com sucesso!',
        data: newPart,
        maintenance: this.enrichMaintenance(maintenance, companyId),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/maintenance/:id/parts/:partId
   * Remove part from maintenance order
   */
  async removePart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id, partId } = req.params;

      const maintenance = db.maintenances.find(
        (m) => (m.id === id || m.codigo === id) && (m.companyId === companyId || m.tenantId === companyId)
      );

      if (!maintenance) {
        res.status(404).json({
          error: 'MAINTENANCE_NOT_FOUND',
          message: 'Ordem de manutenção não encontrada.',
        });
        return;
      }

      const index = db.maintenanceParts.findIndex((p) => p.id === partId && p.maintenanceId === maintenance.id);
      if (index === -1) {
        res.status(404).json({
          error: 'PART_NOT_FOUND',
          message: 'Peça não encontrada.',
        });
        return;
      }

      db.maintenanceParts.splice(index, 1);
      db.recalculateMaintenanceCosts(maintenance.id);

      res.json({
        message: 'Peça removida com sucesso!',
        maintenance: this.enrichMaintenance(maintenance, companyId),
      });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // PLANS (PLANOS PREVENTIVOS)
  // ==========================================

  async listPlans(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { vehicleId } = req.query;

      let list = db.maintenancePlans.filter(
        (p) => p.companyId === companyId || p.tenantId === companyId
      );

      if (vehicleId && typeof vehicleId === 'string') {
        list = list.filter((p) => p.vehicleId === null || p.vehicleId === vehicleId);
      }

      const enriched = list.map((p) => {
        const vehicle = p.vehicleId ? db.vehicles.find((v) => v.id === p.vehicleId) : null;
        return {
          ...p,
          vehicle: vehicle ? { id: vehicle.id, plate: vehicle.plate, model: `${vehicle.brand} ${vehicle.model}` } : null,
        };
      });

      res.json({ data: enriched, total: enriched.length });
    } catch (err) {
      next(err);
    }
  }

  async createPlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const data = maintenancePlanSchema.parse(req.body);
      const now = new Date().toISOString();

      const newPlan: MaintenancePlan = {
        id: generateUUID(),
        companyId,
        tenantId: companyId,
        vehicleId: data.vehicleId || null,
        nomeServico: data.nomeServico.toUpperCase(),
        descricao: data.descricao ? data.descricao.toUpperCase() : null,
        intervaloKm: data.intervaloKm || null,
        ultimaKm: data.ultimaKm || null,
        proximaKm: data.proximaKm || (data.intervaloKm ? (data.ultimaKm || 0) + data.intervaloKm : null),
        intervaloDias: data.intervaloDias || null,
        ultimaData: data.ultimaData || null,
        proximaData: data.proximaData || null,
        alertaKmFaltando: data.alertaKmFaltando || 1000,
        alertaDiasFaltando: data.alertaDiasFaltando || 15,
        status: data.status || 'ATIVO',
        createdAt: now,
        updatedAt: now,
      };

      db.maintenancePlans.push(newPlan);

      res.status(201).json({
        message: 'Plano preventivo cadastrado com sucesso!',
        data: newPlan,
      });
    } catch (err) {
      next(err);
    }
  }

  async updatePlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const data = maintenancePlanSchema.partial().parse(req.body);

      const plan = db.maintenancePlans.find(
        (p) => p.id === id && (p.companyId === companyId || p.tenantId === companyId)
      );

      if (!plan) {
        res.status(404).json({
          error: 'PLAN_NOT_FOUND',
          message: 'Plano preventivo não encontrado.',
        });
        return;
      }

      if (data.nomeServico !== undefined) plan.nomeServico = data.nomeServico.toUpperCase();
      if (data.descricao !== undefined) plan.descricao = data.descricao ? data.descricao.toUpperCase() : null;
      if (data.intervaloKm !== undefined) plan.intervaloKm = data.intervaloKm;
      if (data.ultimaKm !== undefined) plan.ultimaKm = data.ultimaKm;
      if (data.proximaKm !== undefined) plan.proximaKm = data.proximaKm;
      if (data.intervaloDias !== undefined) plan.intervaloDias = data.intervaloDias;
      if (data.ultimaData !== undefined) plan.ultimaData = data.ultimaData;
      if (data.proximaData !== undefined) plan.proximaData = data.proximaData;
      if (data.alertaKmFaltando !== undefined) plan.alertaKmFaltando = data.alertaKmFaltando;
      if (data.alertaDiasFaltando !== undefined) plan.alertaDiasFaltando = data.alertaDiasFaltando;
      if (data.status !== undefined) plan.status = data.status;
      if (data.vehicleId !== undefined) plan.vehicleId = data.vehicleId;

      plan.updatedAt = new Date().toISOString();

      res.json({
        message: 'Plano preventivo atualizado com sucesso!',
        data: plan,
      });
    } catch (err) {
      next(err);
    }
  }

  async deletePlan(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const index = db.maintenancePlans.findIndex(
        (p) => p.id === id && (p.companyId === companyId || p.tenantId === companyId)
      );

      if (index === -1) {
        res.status(404).json({
          error: 'PLAN_NOT_FOUND',
          message: 'Plano preventivo não encontrado.',
        });
        return;
      }

      db.maintenancePlans.splice(index, 1);
      res.json({ message: 'Plano preventivo removido com sucesso!' });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // WORKSHOPS (OFICINAS)
  // ==========================================

  async listWorkshops(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const list = db.workshops.filter(
        (w) => w.companyId === companyId || w.tenantId === companyId
      );
      res.json({ data: list, total: list.length });
    } catch (err) {
      next(err);
    }
  }

  async createWorkshop(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const data = workshopSchema.parse(req.body);
      const now = new Date().toISOString();

      const newWorkshop: Workshop = {
        id: generateUUID(),
        companyId,
        tenantId: companyId,
        nome: data.nome.toUpperCase(),
        cnpj: data.cnpj || null,
        telefone: data.telefone,
        email: data.email ? data.email.toLowerCase() : null,
        endereco: data.endereco ? data.endereco.toUpperCase() : null,
        cidade: data.cidade ? data.cidade.toUpperCase() : null,
        uf: data.uf ? data.uf.toUpperCase() : null,
        observacoes: data.observacoes ? data.observacoes.toUpperCase() : null,
        ativo: data.ativo ?? true,
        createdAt: now,
        updatedAt: now,
      };

      db.workshops.push(newWorkshop);

      res.status(201).json({
        message: 'Oficina cadastrada com sucesso!',
        data: newWorkshop,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateWorkshop(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const data = workshopSchema.partial().parse(req.body);

      const workshop = db.workshops.find(
        (w) => w.id === id && (w.companyId === companyId || w.tenantId === companyId)
      );

      if (!workshop) {
        res.status(404).json({
          error: 'WORKSHOP_NOT_FOUND',
          message: 'Oficina não encontrada.',
        });
        return;
      }

      if (data.nome !== undefined) workshop.nome = data.nome.toUpperCase();
      if (data.cnpj !== undefined) workshop.cnpj = data.cnpj;
      if (data.telefone !== undefined) workshop.telefone = data.telefone;
      if (data.email !== undefined) workshop.email = data.email ? data.email.toLowerCase() : null;
      if (data.endereco !== undefined) workshop.endereco = data.endereco ? data.endereco.toUpperCase() : null;
      if (data.cidade !== undefined) workshop.cidade = data.cidade ? data.cidade.toUpperCase() : null;
      if (data.uf !== undefined) workshop.uf = data.uf ? data.uf.toUpperCase() : null;
      if (data.observacoes !== undefined) workshop.observacoes = data.observacoes ? data.observacoes.toUpperCase() : null;
      if (data.ativo !== undefined) workshop.ativo = data.ativo;

      workshop.updatedAt = new Date().toISOString();

      res.json({
        message: 'Oficina atualizada com sucesso!',
        data: workshop,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteWorkshop(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const index = db.workshops.findIndex(
        (w) => w.id === id && (w.companyId === companyId || w.tenantId === companyId)
      );

      if (index === -1) {
        res.status(404).json({
          error: 'WORKSHOP_NOT_FOUND',
          message: 'Oficina não encontrada.',
        });
        return;
      }

      db.workshops.splice(index, 1);
      res.json({ message: 'Oficina removida com sucesso!' });
    } catch (err) {
      next(err);
    }
  }

  // ==========================================
  // SUPPLIERS (FORNECEDORES)
  // ==========================================

  async listSuppliers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const list = db.suppliers.filter(
        (s) => s.companyId === companyId || s.tenantId === companyId
      );
      res.json({ data: list, total: list.length });
    } catch (err) {
      next(err);
    }
  }

  async createSupplier(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const data = supplierSchema.parse(req.body);
      const now = new Date().toISOString();

      const newSupplier: Supplier = {
        id: generateUUID(),
        companyId,
        tenantId: companyId,
        nome: data.nome.toUpperCase(),
        tipo: data.tipo || 'OFICINA',
        cpfCnpj: data.cpfCnpj || null,
        telefone: data.telefone,
        email: data.email ? data.email.toLowerCase() : null,
        endereco: data.endereco ? data.endereco.toUpperCase() : null,
        observacoes: data.observacoes ? data.observacoes.toUpperCase() : null,
        ativo: data.ativo ?? true,
        createdAt: now,
        updatedAt: now,
      };

      db.suppliers.push(newSupplier);

      res.status(201).json({
        message: 'Fornecedor cadastrado com sucesso!',
        data: newSupplier,
      });
    } catch (err) {
      next(err);
    }
  }

  async updateSupplier(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const data = supplierSchema.partial().parse(req.body);

      const supplier = db.suppliers.find(
        (s) => s.id === id && (s.companyId === companyId || s.tenantId === companyId)
      );

      if (!supplier) {
        res.status(404).json({
          error: 'SUPPLIER_NOT_FOUND',
          message: 'Fornecedor não encontrado.',
        });
        return;
      }

      if (data.nome !== undefined) supplier.nome = data.nome.toUpperCase();
      if (data.tipo !== undefined) supplier.tipo = data.tipo;
      if (data.cpfCnpj !== undefined) supplier.cpfCnpj = data.cpfCnpj;
      if (data.telefone !== undefined) supplier.telefone = data.telefone;
      if (data.email !== undefined) supplier.email = data.email ? data.email.toLowerCase() : null;
      if (data.endereco !== undefined) supplier.endereco = data.endereco ? data.endereco.toUpperCase() : null;
      if (data.observacoes !== undefined) supplier.observacoes = data.observacoes ? data.observacoes.toUpperCase() : null;
      if (data.ativo !== undefined) supplier.ativo = data.ativo;

      supplier.updatedAt = new Date().toISOString();

      res.json({
        message: 'Fornecedor atualizado com sucesso!',
        data: supplier,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteSupplier(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const index = db.suppliers.findIndex(
        (s) => s.id === id && (s.companyId === companyId || s.tenantId === companyId)
      );

      if (index === -1) {
        res.status(404).json({
          error: 'SUPPLIER_NOT_FOUND',
          message: 'Fornecedor não encontrado.',
        });
        return;
      }

      db.suppliers.splice(index, 1);
      res.json({ message: 'Fornecedor removido com sucesso!' });
    } catch (err) {
      next(err);
    }
  }
}

export const maintenanceController = new MaintenanceController();

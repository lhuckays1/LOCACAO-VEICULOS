import { Response, NextFunction } from 'express';
import {
  db,
  generateUUID,
  Rental,
  RentalPayment,
  RentalInspection,
  VehicleMileage,
  BillingFrequency,
  DepositStatus,
  RentalStatus,
} from '../db/store.js';
import {
  rentalSchema,
  payInstallmentSchema,
  updateCaucaoSchema,
} from '../schemas/index.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class RentalsController {
  /**
   * Helper to normalize rental status
   */
  private normalizeStatus(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'RASCUNHO',
      SCHEDULED: 'AGENDADA',
      ACTIVE: 'ATIVA',
      COMPLETED: 'FINALIZADA',
      CANCELLED: 'CANCELADA',
      OVERDUE: 'ATRASADA',
    };
    return map[status] || status;
  }

  /**
   * Helper to calculate installment due dates
   */
  private calculateInstallmentDate(
    startDateStr: string,
    periodIndex: number,
    tipoCobranca: BillingFrequency,
    diaVencimento: number
  ): string {
    const date = new Date(startDateStr);
    if (isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }

    if (tipoCobranca === 'DIARIA') {
      date.setDate(date.getDate() + periodIndex);
    } else if (tipoCobranca === 'SEMANAL') {
      date.setDate(date.getDate() + periodIndex * 7);
    } else if (tipoCobranca === 'QUINZENAL') {
      date.setDate(date.getDate() + periodIndex * 15);
    } else if (tipoCobranca === 'MENSAL') {
      date.setMonth(date.getMonth() + periodIndex);
      // Set to chosen diaVencimento if valid for this month
      const maxDaysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      const targetDay = Math.min(diaVencimento || date.getDate(), maxDaysInMonth);
      date.setDate(targetDay);
    }
    return date.toISOString().split('T')[0];
  }

  /**
   * GET /api/rentals
   * List rentals with filtering and enriched data
   */
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { status, search, clientId, vehicleId, startDate, endDate } = req.query;

      // Update statuses based on current date
      db.updateRentalPaymentStatuses();

      let rentals = db.rentals.filter(
        (r) => r.companyId === companyId || r.tenantId === companyId
      );

      // Status filter
      if (status && typeof status === 'string' && status !== 'ALL' && status !== 'TODAS') {
        const queryStatusNorm = this.normalizeStatus(status);
        rentals = rentals.filter((r) => this.normalizeStatus(r.status) === queryStatusNorm);
      }

      // Client filter
      if (clientId && typeof clientId === 'string') {
        rentals = rentals.filter((r) => r.clientId === clientId || r.clienteId === clientId);
      }

      // Vehicle filter
      if (vehicleId && typeof vehicleId === 'string') {
        rentals = rentals.filter((r) => r.vehicleId === vehicleId || r.veiculoId === vehicleId);
      }

      // Period filter
      if (startDate && typeof startDate === 'string') {
        rentals = rentals.filter((r) => (r.dataInicio || r.startDate) >= startDate);
      }
      if (endDate && typeof endDate === 'string') {
        rentals = rentals.filter((r) => (r.dataFimPrevista || r.endDate) <= endDate);
      }

      const todayStr = new Date().toISOString().split('T')[0];

      const enriched = rentals.map((r) => {
        const client = db.clients.find((c) => c.id === (r.clienteId || r.clientId));
        const vehicle = db.vehicles.find((v) => v.id === (r.veiculoId || r.vehicleId));
        const payments = db.rentalPayments.filter((p) => p.rentalId === r.id);

        const totalPaid = payments
          .filter((p) => p.status === 'PAGO')
          .reduce((sum, p) => sum + p.valor, 0);
        const totalPending = payments
          .filter((p) => p.status === 'PENDENTE')
          .reduce((sum, p) => sum + p.valor, 0);
        const totalOverdue = payments
          .filter((p) => p.status === 'ATRASADO')
          .reduce((sum, p) => sum + p.valor, 0);

        // Find next due date
        const pendingPayments = payments
          .filter((p) => p.status === 'PENDENTE' || p.status === 'ATRASADO')
          .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
        const nextDueDate = pendingPayments.length > 0 ? pendingPayments[0].dataVencimento : null;

        // Auto-check if rental has overdue payments and is active
        let effectiveStatus = this.normalizeStatus(r.status);
        if (effectiveStatus === 'ATIVA' && totalOverdue > 0) {
          effectiveStatus = 'ATRASADA';
        }

        return {
          ...r,
          codigoContrato: r.codigoContrato || r.rentalNumber,
          rentalNumber: r.codigoContrato || r.rentalNumber,
          status: effectiveStatus,
          statusOriginal: r.status,
          client: client
            ? {
                id: client.id,
                name: client.name,
                cpfCnpj: client.cpfCnpj,
                phone: client.phone,
                email: client.email,
                driverLicense: client.driverLicense,
                driverLicenseExpiration: client.driverLicenseExpiration,
                active: client.active,
              }
            : null,
          vehicle: vehicle
            ? {
                id: vehicle.id,
                plate: vehicle.plate,
                brand: vehicle.brand,
                model: vehicle.model,
                year: vehicle.modelYear,
                color: vehicle.color,
                category: vehicle.category,
                currentMileage: vehicle.currentMileage,
              }
            : null,
          payments,
          nextDueDate,
          financialSummary: {
            totalPaid,
            totalPending,
            totalOverdue,
            paymentsCount: payments.length,
            paidCount: payments.filter((p) => p.status === 'PAGO').length,
          },
        };
      });

      // Filter by search query if provided
      let result = enriched;
      if (search && typeof search === 'string') {
        const query = search.toUpperCase();
        result = enriched.filter((r) => {
          const code = (r.codigoContrato || r.rentalNumber || '').toUpperCase();
          const clientName = (r.client?.name || '').toUpperCase();
          const vehiclePlate = (r.vehicle?.plate || '').toUpperCase();
          const vehicleModel = (r.vehicle?.model || '').toUpperCase();
          return (
            code.includes(query) ||
            clientName.includes(query) ||
            vehiclePlate.includes(query) ||
            vehicleModel.includes(query)
          );
        });
      }

      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({
        total: result.length,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/rentals/:id
   * Get complete rental details with tabs data (Resumo, Cobranças, Vistorias, Histórico)
   */
  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      db.updateRentalPaymentStatuses();

      const rental = db.rentals.find(
        (r) => (r.id === id || r.codigoContrato === id || r.rentalNumber === id) &&
               (r.companyId === companyId || r.tenantId === companyId)
      );

      if (!rental) {
        res.status(404).json({
          error: 'RENTAL_NOT_FOUND',
          message: 'Locação não encontrada.',
        });
        return;
      }

      const client = db.clients.find((c) => c.id === (rental.clienteId || rental.clientId));
      const vehicle = db.vehicles.find((v) => v.id === (rental.veiculoId || rental.vehicleId));
      const payments = db.rentalPayments
        .filter((p) => p.rentalId === rental.id)
        .sort((a, b) => a.numeroParcela - b.numeroParcela);
      const inspections = db.rentalInspections.filter((i) => i.rentalId === rental.id);
      const auditLogs = db.auditLogs.filter(
        (l) => (l.entityId === rental.id || l.entityId === rental.codigoContrato) &&
               (l.companyId === companyId)
      );

      const totalPaid = payments
        .filter((p) => p.status === 'PAGO')
        .reduce((sum, p) => sum + p.valor, 0);
      const totalPending = payments
        .filter((p) => p.status === 'PENDENTE')
        .reduce((sum, p) => sum + p.valor, 0);
      const totalOverdue = payments
        .filter((p) => p.status === 'ATRASADO')
        .reduce((sum, p) => sum + p.valor, 0);

      const pendingPayments = payments
        .filter((p) => p.status === 'PENDENTE' || p.status === 'ATRASADO')
        .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
      const nextDueDate = pendingPayments.length > 0 ? pendingPayments[0].dataVencimento : null;

      let effectiveStatus = this.normalizeStatus(rental.status);
      if (effectiveStatus === 'ATIVA' && totalOverdue > 0) {
        effectiveStatus = 'ATRASADA';
      }

      res.json({
        data: {
          ...rental,
          codigoContrato: rental.codigoContrato || rental.rentalNumber,
          status: effectiveStatus,
          client: client || null,
          vehicle: vehicle || null,
          payments,
          inspections,
          history: auditLogs,
          nextDueDate,
          financialSummary: {
            totalPaid,
            totalPending,
            totalOverdue,
            totalExpected: rental.valorFinal || rental.valorTotalPrevisto || rental.amount,
            depositAmount: rental.valorCaucao || rental.depositAmount || 0,
            depositReceived: rental.caucaoRecebida || 0,
            depositStatus: rental.statusCaucao || 'PENDENTE',
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/rentals
   * Create new rental with wizard data, automatic contract numbering, installment generation, and vehicle lock
   */
  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const parsed = rentalSchema.parse(req.body);

      const clientId = parsed.clienteId || parsed.clientId;
      const vehicleId = parsed.veiculoId || parsed.vehicleId;
      const startDate = parsed.dataInicio || parsed.startDate;
      const endDate = parsed.dataFimPrevista || parsed.endDate;

      if (!clientId || !vehicleId || !startDate || !endDate) {
        res.status(400).json({
          error: 'MISSING_FIELDS',
          message: 'Cliente, veículo, data de início e data de término são obrigatórios.',
        });
        return;
      }

      // 1. Verify Client
      const client = db.clients.find(
        (c) => c.id === clientId && c.companyId === companyId
      );
      if (!client) {
        res.status(404).json({
          error: 'CLIENT_NOT_FOUND',
          message: 'Cliente selecionado não foi encontrado nesta empresa.',
        });
        return;
      }

      if (!client.active) {
        res.status(400).json({
          error: 'CLIENT_INACTIVE',
          message: `Não é possível criar locação para o cliente "${client.name}" pois ele está INATIVO no sistema.`,
        });
        return;
      }

      // Check CNH expiration warning
      let cnhAlert: string | null = null;
      if (client.driverLicenseExpiration) {
        const todayStr = new Date().toISOString().split('T')[0];
        if (client.driverLicenseExpiration < todayStr) {
          cnhAlert = `ATENÇÃO: A CNH do cliente ${client.name} está VENCIDA desde ${client.driverLicenseExpiration}.`;
        }
      }

      // 2. Verify Vehicle
      const vehicle = db.vehicles.find(
        (v) => v.id === vehicleId && v.companyId === companyId
      );
      if (!vehicle) {
        res.status(404).json({
          error: 'VEHICLE_NOT_FOUND',
          message: 'Veículo selecionado não encontrado nesta empresa.',
        });
        return;
      }

      if (vehicle.status !== 'AVAILABLE') {
        res.status(400).json({
          error: 'VEHICLE_UNAVAILABLE',
          message: `O veículo ${vehicle.plate} (${vehicle.brand} ${vehicle.model}) não está disponível para locação (Status atual: ${vehicle.status}).`,
        });
        return;
      }

      // Business Rule: Vehicle cannot have two active rentals
      const activeOverlap = db.rentals.find(
        (r) =>
          (r.vehicleId === vehicle.id || r.veiculoId === vehicle.id) &&
          (r.status === 'ATIVA' || r.status === 'ACTIVE' || r.status === 'ATRASADA')
      );
      if (activeOverlap) {
        res.status(400).json({
          error: 'VEHICLE_ALREADY_RENTED',
          message: `O veículo ${vehicle.plate} já possui uma locação ATIVA em andamento (${activeOverlap.codigoContrato || activeOverlap.rentalNumber}).`,
        });
        return;
      }

      const now = new Date().toISOString();
      const rentalId = generateUUID();
      const codigoContrato = db.generateContractNumber(companyId, new Date(startDate).getFullYear());

      // Financial calculations
      const rawTipo = (parsed.tipoCobranca || parsed.billingFrequency || 'SEMANAL').toUpperCase();
      let tipoCobranca: BillingFrequency = 'SEMANAL';
      if (rawTipo.includes('DIAR') || rawTipo === 'DAILY') tipoCobranca = 'DIARIA';
      else if (rawTipo.includes('SEM') || rawTipo === 'WEEKLY') tipoCobranca = 'SEMANAL';
      else if (rawTipo.includes('QUINZ') || rawTipo === 'BIWEEKLY') tipoCobranca = 'QUINZENAL';
      else if (rawTipo.includes('MENS') || rawTipo === 'MONTHLY') tipoCobranca = 'MENSAL';

      const valorPeriodo = Number(parsed.valorPeriodo || parsed.amount || vehicle.dailyRate || 100);
      const quantidadePeriodos = Math.max(1, Number(parsed.quantidadePeriodos || 1));
      const diaVencimento = Number(parsed.diaVencimento || parsed.dueDay || 5);

      const valorTotalPrevisto = parsed.valorTotalPrevisto !== undefined
        ? Number(parsed.valorTotalPrevisto)
        : valorPeriodo * quantidadePeriodos;

      const desconto = Number(parsed.desconto || 0);
      const acrescimos = Number(parsed.acrescimos || 0);
      const valorFinal = parsed.valorFinal !== undefined
        ? Number(parsed.valorFinal)
        : Math.max(0, valorTotalPrevisto - desconto + acrescimos);

      // Caução
      const valorCaucao = Number(parsed.valorCaucao ?? parsed.depositAmount ?? 1000);
      const caucaoRecebida = Number(parsed.caucaoRecebida || 0);
      let statusCaucao: DepositStatus = (parsed.statusCaucao as DepositStatus) || 'PENDENTE';
      if (caucaoRecebida >= valorCaucao && valorCaucao > 0) {
        statusCaucao = 'RECEBIDA';
      } else if (caucaoRecebida > 0 && caucaoRecebida < valorCaucao) {
        statusCaucao = 'PARCIAL';
      }

      // Quilometragem
      const kmInicial = Number(parsed.kmInicial ?? parsed.initialMileage ?? vehicle.currentMileage);
      const franquiaKm = Number(parsed.franquiaKm ?? parsed.mileageAllowance ?? vehicle.mileageAllowance ?? 4000);
      const valorKmExcedente = Number(parsed.valorKmExcedente ?? parsed.excessMileageRate ?? vehicle.excessMileageRate ?? 0.50);

      // Status
      const requestedStatus = this.normalizeStatus(parsed.status || 'ATIVA') as RentalStatus;

      const newRental: Rental = {
        id: rentalId,
        tenantId: companyId,
        companyId,
        codigoContrato,
        rentalNumber: codigoContrato,
        clienteId: client.id,
        clientId: client.id,
        veiculoId: vehicle.id,
        vehicleId: vehicle.id,
        dataInicio: startDate,
        startDate,
        dataFimPrevista: endDate,
        endDate,
        dataFimReal: null,
        actualEndDate: null,
        tipoCobranca,
        billingFrequency: tipoCobranca,
        valorPeriodo,
        amount: valorPeriodo,
        diaVencimento,
        dueDay: diaVencimento,
        quantidadePeriodos,
        valorCaucao,
        depositAmount: valorCaucao,
        caucaoRecebida,
        statusCaucao,
        kmInicial,
        initialMileage: kmInicial,
        kmFinal: null,
        finalMileage: null,
        franquiaKm,
        mileageAllowance: franquiaKm,
        valorKmExcedente,
        excessMileageRate: valorKmExcedente,
        valorTotalPrevisto,
        desconto,
        acrescimos,
        valorFinal,
        status: requestedStatus,
        initialFuelLevel: parsed.initialFuelLevel || 'CHEIO (1/1)',
        finalFuelLevel: null,
        observacoes: parsed.observacoes ? parsed.observacoes.toUpperCase() : null,
        notes: parsed.observacoes ? parsed.observacoes.toUpperCase() : null,
        createdAt: now,
        updatedAt: now,
      };

      db.rentals.unshift(newRental);

      // 3. Update Vehicle Status
      if (requestedStatus === 'ATIVA') {
        vehicle.status = 'RENTED';
        vehicle.updatedAt = now;
      } else if (requestedStatus === 'AGENDADA') {
        vehicle.status = 'RESERVED';
        vehicle.updatedAt = now;
      }

      // 4. Create Vehicle Mileage Log
      const mileageLog: VehicleMileage = {
        id: generateUUID(),
        vehicleId: vehicle.id,
        mileage: kmInicial,
        date: now,
        type: 'RENTAL_START',
        notes: `INÍCIO DE LOCAÇÃO ${codigoContrato} - CLIENTE: ${client.name}`,
        createdBy: req.user!.name,
        createdAt: now,
        updatedAt: now,
      };
      db.vehicleMileages.push(mileageLog);

      // 5. Generate Automatic Installments (RentalPayment)
      const installmentAmount = Math.round((valorFinal / quantidadePeriodos) * 100) / 100;
      const todayStr = new Date().toISOString().split('T')[0];

      for (let i = 0; i < quantidadePeriodos; i++) {
        const dueDate = this.calculateInstallmentDate(startDate, i, tipoCobranca, diaVencimento);
        const isOverdue = dueDate < todayStr;
        const installmentPayment: RentalPayment = {
          id: generateUUID(),
          tenantId: companyId,
          rentalId: newRental.id,
          numeroParcela: i + 1,
          descricao: `Parcela ${i + 1}/${quantidadePeriodos} - Locação ${codigoContrato}`,
          valor: i === quantidadePeriodos - 1
            ? Math.round((valorFinal - installmentAmount * (quantidadePeriodos - 1)) * 100) / 100
            : installmentAmount,
          dataVencimento: dueDate,
          dataPagamento: null,
          formaPagamento: 'PIX',
          status: isOverdue ? 'ATRASADO' : 'PENDENTE',
          observacoes: `COBRANÇA GERADA AUTOMATICAMENTE PELO CONTRATO ${codigoContrato}`,
          createdAt: now,
          updatedAt: now,
        };
        db.rentalPayments.push(installmentPayment);
        db.syncRentalPaymentWithTransaction(installmentPayment, newRental);
      }

      // 6. Generate Initial Outgoing Inspection (Vistoria de Saída)
      const initialInspection: RentalInspection = {
        id: generateUUID(),
        tenantId: companyId,
        rentalId: newRental.id,
        tipo: 'SAIDA',
        dataVistoria: startDate,
        km: kmInicial,
        nivelCombustivel: newRental.initialFuelLevel || 'CHEIO (1/1)',
        itensChecklist: [
          { item: 'DOCUMENTAÇÃO (CRLV-e)', ok: true },
          { item: 'CHAVE PRINCIPAL E RESERVA', ok: true },
          { item: 'MANUAL DO VEÍCULO', ok: true },
          { item: 'ESTEPE, MACACO E CHAVE DE RODA', ok: true },
          { item: 'TRIÂNGULO DE SINALIZAÇÃO', ok: true },
          { item: 'PNEUS EM PERFEITAS CONDIÇÕES', ok: true },
          { item: 'SISTEMA DE FREIOS E LUZES', ok: true },
          { item: 'AR CONDICIONADO E ACESSÓRIOS', ok: true },
        ],
        avariasIdentificadas: [],
        responsavelNome: req.user!.name,
        observacoes: 'VISTORIA DE SAÍDA REALIZADA E APROVADA NA ENTREGA DAS CHAVES.',
        statusAprovacao: 'APROVADO',
        createdAt: now,
      };
      db.rentalInspections.push(initialInspection);

      // 7. Register Audit Log
      db.createAuditLog(companyId, req.user!.userId, 'CREATE', 'RENTAL', newRental.id, null, {
        codigoContrato,
        clientName: client.name,
        vehiclePlate: vehicle.plate,
        valorFinal,
        tipoCobranca,
        quantidadePeriodos,
        status: requestedStatus,
      });

      res.status(201).json({
        message: `Locação ${codigoContrato} cadastrada e gerada com sucesso!`,
        data: newRental,
        cnhAlert,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/rentals/:id/cancel
   * Cancel rental. Only allowed for RASCUNHO or AGENDADA
   */
  async cancel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const { motivo } = req.body;

      const rental = db.rentals.find(
        (r) => (r.id === id || r.codigoContrato === id || r.rentalNumber === id) &&
               (r.companyId === companyId || r.tenantId === companyId)
      );

      if (!rental) {
        res.status(404).json({
          error: 'RENTAL_NOT_FOUND',
          message: 'Locação não encontrada.',
        });
        return;
      }

      const normStatus = this.normalizeStatus(rental.status);
      if (normStatus !== 'RASCUNHO' && normStatus !== 'AGENDADA') {
        res.status(400).json({
          error: 'INVALID_STATUS_FOR_CANCELLATION',
          message: `Apenas locações com status RASCUNHO ou AGENDADA podem ser canceladas. A locação atual está com status "${normStatus}". Para encerrar uma locação ativa, realize a devolução do veículo.`,
        });
        return;
      }

      const now = new Date().toISOString();
      rental.status = 'CANCELADA';
      rental.updatedAt = now;
      if (motivo) {
        rental.observacoes = `${rental.observacoes || ''} | CANCELAMENTO: ${motivo}`.trim().toUpperCase();
        rental.notes = rental.observacoes;
      }

      // Cancel all pending payments for this rental
      const payments = db.rentalPayments.filter((p) => p.rentalId === rental.id);
      for (const p of payments) {
        if (p.status === 'PENDENTE' || p.status === 'ATRASADO') {
          p.status = 'CANCELADO';
          p.updatedAt = now;
        }
      }

      // Release vehicle if reserved
      const vehicle = db.vehicles.find((v) => v.id === (rental.veiculoId || rental.vehicleId));
      if (vehicle && vehicle.status === 'RESERVED') {
        vehicle.status = 'AVAILABLE';
        vehicle.updatedAt = now;
      }

      db.createAuditLog(companyId, req.user!.userId, 'CANCEL', 'RENTAL', rental.id, { oldStatus: normStatus }, {
        status: 'CANCELADA',
        motivo,
      });

      res.json({
        message: `Locação ${rental.codigoContrato || rental.rentalNumber} cancelada com sucesso. Cobranças pendentes foram desativadas e o veículo liberado.`,
        data: rental,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/rentals/:id/status
   * Update rental status (e.g. Devolução do Veículo / FINALIZADA)
   */
  async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const { status, finalMileage, finalFuelLevel, notes, checkListRetorno, avariasRetorno } = req.body;

      const rental = db.rentals.find(
        (r) => (r.id === id || r.codigoContrato === id || r.rentalNumber === id) &&
               (r.companyId === companyId || r.tenantId === companyId)
      );

      if (!rental) {
        res.status(404).json({
          error: 'RENTAL_NOT_FOUND',
          message: 'Locação não encontrada.',
        });
        return;
      }

      const vehicle = db.vehicles.find((v) => v.id === (rental.veiculoId || rental.vehicleId));
      const now = new Date().toISOString();
      const normTargetStatus = this.normalizeStatus(status);

      // Handle Finalização / Devolução
      if (normTargetStatus === 'FINALIZADA' || normTargetStatus === 'COMPLETED') {
        let parsedFinalKm = rental.kmInicial;
        if (finalMileage !== undefined && finalMileage !== null) {
          parsedFinalKm = Number(finalMileage);
          const minRequiredKm = vehicle
            ? Math.max(vehicle.currentMileage, rental.kmInicial)
            : rental.kmInicial;

          if (parsedFinalKm < minRequiredKm) {
            res.status(400).json({
              error: 'INVALID_FINAL_MILEAGE',
              message: `A quilometragem final (${parsedFinalKm} km) não pode ser inferior à quilometragem inicial da locação ou atual do veículo (${minRequiredKm} km).`,
            });
            return;
          }
        }

        rental.status = 'FINALIZADA';
        rental.kmFinal = parsedFinalKm;
        rental.finalMileage = parsedFinalKm;
        rental.dataFimReal = now;
        rental.actualEndDate = now;
        rental.finalFuelLevel = finalFuelLevel || rental.initialFuelLevel || 'CHEIO (1/1)';
        rental.updatedAt = now;

        if (notes) {
          rental.observacoes = `${rental.observacoes || ''} | DEVOLUÇÃO: ${notes}`.trim().toUpperCase();
          rental.notes = rental.observacoes;
        }

        // Return vehicle to AVAILABLE status
        if (vehicle) {
          vehicle.status = 'AVAILABLE';
          if (parsedFinalKm > vehicle.currentMileage) {
            vehicle.currentMileage = parsedFinalKm;
            db.vehicleMileages.push({
              id: generateUUID(),
              vehicleId: vehicle.id,
              mileage: parsedFinalKm,
              date: now,
              type: 'RENTAL_END',
              notes: `DEVOLUÇÃO DE LOCAÇÃO ${rental.codigoContrato || rental.rentalNumber}`,
              createdBy: req.user!.name,
              createdAt: now,
              updatedAt: now,
            });
          }
          vehicle.updatedAt = now;
        }

        // Create Vistoria de Retorno automatically
        const returnInspection: RentalInspection = {
          id: generateUUID(),
          tenantId: companyId,
          rentalId: rental.id,
          tipo: 'RETORNO',
          dataVistoria: now,
          km: parsedFinalKm,
          nivelCombustivel: rental.finalFuelLevel,
          itensChecklist: checkListRetorno || [
            { item: 'DOCUMENTAÇÃO DEVOLVIDA', ok: true },
            { item: 'CHAVES ENTREGUES', ok: true },
            { item: 'ESTEPE E FERRAMENTAS CONFERIDOS', ok: true },
            { item: 'PNEUS CONFERIDOS', ok: true },
            { item: 'INTERIOR LIMPO', ok: true },
          ],
          avariasIdentificadas: avariasRetorno || [],
          responsavelNome: req.user!.name,
          observacoes: notes ? `DEVOLUÇÃO: ${notes}` : 'VISTORIA DE RETORNO CONCLUÍDA.',
          statusAprovacao: 'APROVADO',
          createdAt: now,
        };
        db.rentalInspections.push(returnInspection);

        db.createAuditLog(companyId, req.user!.userId, 'RETURN_VEHICLE', 'RENTAL', rental.id, null, {
          status: 'FINALIZADA',
          kmFinal: parsedFinalKm,
          finalFuelLevel: rental.finalFuelLevel,
        });

        res.json({
          message: `Devolução da locação ${rental.codigoContrato || rental.rentalNumber} registrada com sucesso! Veículo liberado para a frota.`,
          data: rental,
        });
        return;
      }

      // Other status changes
      rental.status = normTargetStatus as RentalStatus;
      rental.updatedAt = now;
      if (notes) {
        rental.observacoes = `${rental.observacoes || ''} | ${notes}`.trim().toUpperCase();
        rental.notes = rental.observacoes;
      }

      db.createAuditLog(companyId, req.user!.userId, 'STATUS_UPDATE', 'RENTAL', rental.id, null, {
        status: normTargetStatus,
      });

      res.json({
        message: `Status da locação alterado para ${normTargetStatus}.`,
        data: rental,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/rentals/:id/payments/:paymentId/pay
   * Mark an installment payment as PAID
   */
  async payPayment(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id, paymentId } = req.params;
      const parsed = payInstallmentSchema.parse(req.body);

      const rental = db.rentals.find(
        (r) => (r.id === id || r.codigoContrato === id || r.rentalNumber === id) &&
               (r.companyId === companyId || r.tenantId === companyId)
      );

      if (!rental) {
        res.status(404).json({
          error: 'RENTAL_NOT_FOUND',
          message: 'Locação não encontrada.',
        });
        return;
      }

      const payment = db.rentalPayments.find(
        (p) => p.id === paymentId && p.rentalId === rental.id
      );

      if (!payment) {
        res.status(404).json({
          error: 'PAYMENT_NOT_FOUND',
          message: 'Parcela de cobrança não encontrada.',
        });
        return;
      }

      const now = new Date().toISOString();
      payment.status = 'PAGO';
      payment.dataPagamento = parsed.dataPagamento || now.split('T')[0];
      payment.formaPagamento = parsed.formaPagamento.toUpperCase();
      if (parsed.observacoes) {
        payment.observacoes = parsed.observacoes.toUpperCase();
      }
      payment.updatedAt = now;

      db.syncRentalPaymentWithTransaction(payment, rental);
      const tx = db.financialTransactions.find((t) => t.rentalPaymentId === payment.id);
      if (tx) {
        db.financialSettlements.unshift({
          id: generateUUID(),
          tenantId: companyId,
          companyId,
          transactionId: tx.id,
          amount: payment.valor,
          paymentDate: payment.dataPagamento || now.split('T')[0],
          paymentMethod: (payment.formaPagamento as any) || 'PIX',
          interest: 0,
          fine: 0,
          discount: 0,
          notes: 'BAIXA CONFIRMADA VIA GESTÃO DE LOCAÇÕES',
          userId: req.user!.userId,
          createdAt: now,
        });
      }

      db.createAuditLog(companyId, req.user!.userId, 'PAYMENT', 'RENTAL_PAYMENT', payment.id, null, {
        rentalNumber: rental.codigoContrato || rental.rentalNumber,
        numeroParcela: payment.numeroParcela,
        valor: payment.valor,
        formaPagamento: payment.formaPagamento,
        dataPagamento: payment.dataPagamento,
      });

      res.json({
        message: `Parcela ${payment.numeroParcela} no valor de R$ ${payment.valor.toFixed(2)} confirmada como PAGA com sucesso!`,
        data: payment,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/rentals/:id/caucao
   * Update deposit amount / status
   */
  async updateCaucao(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const parsed = updateCaucaoSchema.parse(req.body);

      const rental = db.rentals.find(
        (r) => (r.id === id || r.codigoContrato === id || r.rentalNumber === id) &&
               (r.companyId === companyId || r.tenantId === companyId)
      );

      if (!rental) {
        res.status(404).json({
          error: 'RENTAL_NOT_FOUND',
          message: 'Locação não encontrada.',
        });
        return;
      }

      const now = new Date().toISOString();
      rental.statusCaucao = parsed.statusCaucao;
      rental.caucaoRecebida = parsed.caucaoRecebida;
      rental.updatedAt = now;

      if (parsed.observacoes) {
        rental.observacoes = `${rental.observacoes || ''} | CAUÇÃO: ${parsed.observacoes}`.trim().toUpperCase();
        rental.notes = rental.observacoes;
      }

      db.createAuditLog(companyId, req.user!.userId, 'UPDATE_DEPOSIT', 'RENTAL', rental.id, null, {
        statusCaucao: parsed.statusCaucao,
        caucaoRecebida: parsed.caucaoRecebida,
      });

      res.json({
        message: `Status da caução atualizado para ${parsed.statusCaucao} (R$ ${parsed.caucaoRecebida.toFixed(2)} recebido).`,
        data: rental,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const rentalsController = new RentalsController();

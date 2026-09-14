import { Response, NextFunction } from 'express';
import { db } from '../db/store.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class DashboardController {
  async getMetrics(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      // Update payments status based on today's date
      db.updateRentalPaymentStatuses();

      const companyVehicles = db.vehicles.filter((v) => v.companyId === companyId);
      const companyClients = db.clients.filter((c) => c.companyId === companyId);
      const companyRentals = db.rentals.filter(
        (r) => r.companyId === companyId || r.tenantId === companyId
      );
      const companyPayments = db.rentalPayments.filter(
        (p) => p.tenantId === companyId
      );
      const legacyPayments = db.payments.filter((p) => p.companyId === companyId);
      const companyExpenses = db.expenses.filter((e) => e.companyId === companyId);
      const companyMaintenances = db.maintenances.filter((m) => m.companyId === companyId);

      // 1. Vehicle counts by status
      const totalVehicles = companyVehicles.length;
      const availableVehicles = companyVehicles.filter((v) => v.status === 'AVAILABLE').length;
      const rentedVehicles = companyVehicles.filter((v) => v.status === 'RENTED').length;
      const maintenanceVehicles = companyVehicles.filter((v) => v.status === 'MAINTENANCE').length;
      const blockedVehicles = companyVehicles.filter((v) => v.status === 'BLOCKED').length;
      const soldVehicles = companyVehicles.filter((v) => v.status === 'SOLD').length;

      // 2. Clients
      const totalClients = companyClients.length;
      const activeClients = companyClients.filter((c) => c.active).length;

      // 3. Rentals
      const activeRentals = companyRentals.filter(
        (r) => r.status === 'ATIVA' || r.status === 'ACTIVE'
      ).length;

      // Overdue rentals: rentals with overdue payments or status ATRASADA
      const overdueRentalIds = new Set(
        companyPayments.filter((p) => p.status === 'ATRASADO').map((p) => p.rentalId)
      );
      const overdueRentals = companyRentals.filter(
        (r) => r.status === 'ATRASADA' || r.status === 'OVERDUE' || overdueRentalIds.has(r.id)
      ).length;

      const totalRentals = companyRentals.length;

      // 4. Financial Calculations from rental payments
      const rentalPaidRevenue = companyPayments
        .filter((p) => p.status === 'PAGO')
        .reduce((sum, p) => sum + p.valor, 0);

      const legacyPaidRevenue = legacyPayments
        .filter((p) => p.status === 'PAID')
        .reduce((sum, p) => sum + (p.paidAmount || p.amount || 0), 0);

      const totalRevenue = Math.max(rentalPaidRevenue, legacyPaidRevenue);

      const pendingRevenue = companyPayments
        .filter((p) => p.status === 'PENDENTE')
        .reduce((sum, p) => sum + p.valor, 0);

      const overdueRevenue = companyPayments
        .filter((p) => p.status === 'ATRASADO')
        .reduce((sum, p) => sum + p.valor, 0);

      const totalExpenses = companyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const netProfit = totalRevenue - totalExpenses;

      // Fleet utilization rate: (veiculosAlugados / totalVeiculosAtivos) * 100
      const activeFleetTotal = totalVehicles - soldVehicles;
      const utilizationRate =
        activeFleetTotal > 0 ? Math.round((rentedVehicles / activeFleetTotal) * 100) : 0;

      // Próximos Vencimentos de Cobranças de Locação
      const upcomingDuePayments = companyPayments
        .filter((p) => p.status === 'PENDENTE' || p.status === 'ATRASADO')
        .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))
        .slice(0, 10)
        .map((p) => {
          const rental = companyRentals.find((r) => r.id === p.rentalId);
          const client = rental
            ? companyClients.find((c) => c.id === (rental.clienteId || rental.clientId))
            : null;
          const vehicle = rental
            ? companyVehicles.find((v) => v.id === (rental.veiculoId || rental.vehicleId))
            : null;

          return {
            id: p.id,
            rentalId: p.rentalId,
            codigoContrato: rental?.codigoContrato || rental?.rentalNumber || 'N/A',
            clienteNome: client ? client.name : 'CLIENTE NÃO IDENTIFICADO',
            clienteTelefone: client ? client.phone : '',
            veiculoModelo: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'VEÍCULO NÃO IDENTIFICADO',
            veiculoPlaca: vehicle ? vehicle.plate : '---',
            numeroParcela: p.numeroParcela,
            dataVencimento: p.dataVencimento,
            valor: p.valor,
            status: p.status,
            descricao: p.descricao,
          };
        });

      // Recent rentals with client and vehicle details
      const recentRentals = companyRentals
        .slice(-5)
        .reverse()
        .map((r) => {
          const client = companyClients.find((c) => c.id === (r.clienteId || r.clientId));
          const vehicle = companyVehicles.find((v) => v.id === (r.veiculoId || r.vehicleId));
          return {
            id: r.id,
            rentalNumber: r.codigoContrato || r.rentalNumber,
            codigoContrato: r.codigoContrato || r.rentalNumber,
            clientName: client ? client.name : 'N/A',
            vehiclePlate: vehicle ? vehicle.plate : 'N/A',
            vehicleModel: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'N/A',
            startDate: r.dataInicio || r.startDate,
            endDate: r.dataFimPrevista || r.endDate,
            amount: r.valorPeriodo || r.amount,
            billingFrequency: r.tipoCobranca || r.billingFrequency,
            status: r.status,
          };
        });

      // Urgent Maintenances
      const urgentMaintenances = companyMaintenances
        .filter((m) => m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS')
        .slice(0, 5)
        .map((m) => {
          const vehicle = companyVehicles.find((v) => v.id === m.vehicleId);
          return {
            id: m.id,
            vehiclePlate: vehicle ? vehicle.plate : 'N/A',
            vehicleModel: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'N/A',
            type: m.type,
            description: m.description,
            scheduledDate: m.scheduledDate,
            workshop: m.workshop,
            cost: m.cost,
            status: m.status,
          };
        });

      res.json({
        metrics: {
          totalVehicles,
          availableVehicles,
          rentedVehicles,
          maintenanceVehicles,
          blockedVehicles,
          totalClients,
          activeClients,
          activeRentals,
          overdueRentals,
          totalRentals,
          totalRevenue,
          pendingRevenue,
          overdueRevenue,
          totalExpenses,
          netProfit,
          utilizationRate,
        },
        upcomingDuePayments,
        recentRentals,
        urgentMaintenances,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const dashboardController = new DashboardController();

import { Response, NextFunction } from 'express';
import {
  FinancialStatus,
  FinancialType,
  MaintenanceStatus,
  PaymentStatus,
  RentalStatus,
  VehicleStatus,
} from '@prisma/client';

import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

const decimalToNumber = (value: unknown): number => Number(value ?? 0);

export class DashboardController {
  async getMetrics(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const companyId = req.user?.companyId;

      if (!companyId) {
        res.status(403).json({
          error: 'COMPANY_REQUIRED',
          message: 'Usuário não está vinculado a uma empresa.',
        });
        return;
      }

      /*
       * ============================================================
       * 1. FROTA
       * ============================================================
       */

      const [
        totalVehicles,
        availableVehicles,
        rentedVehicles,
        maintenanceVehicles,
        blockedVehicles,
        soldVehicles,
        totalClients,
        activeClients,
        totalRentals,
        activeRentals,
        overdueRentals,
      ] = await Promise.all([
        prisma.vehicle.count({
          where: { companyId },
        }),

        prisma.vehicle.count({
          where: {
            companyId,
            status: VehicleStatus.AVAILABLE,
          },
        }),

        prisma.vehicle.count({
          where: {
            companyId,
            status: VehicleStatus.RENTED,
          },
        }),

        prisma.vehicle.count({
          where: {
            companyId,
            status: VehicleStatus.MAINTENANCE,
          },
        }),

        prisma.vehicle.count({
          where: {
            companyId,
            status: VehicleStatus.BLOCKED,
          },
        }),

        prisma.vehicle.count({
          where: {
            companyId,
            status: VehicleStatus.SOLD,
          },
        }),

        /*
         * ==========================================================
         * 2. CLIENTES
         * ==========================================================
         */

        prisma.client.count({
          where: { companyId },
        }),

        prisma.client.count({
          where: {
            companyId,
            active: true,
          },
        }),

        /*
         * ==========================================================
         * 3. LOCAÇÕES
         * ==========================================================
         */

        prisma.rental.count({
          where: { companyId },
        }),

        prisma.rental.count({
          where: {
            companyId,
            status: RentalStatus.ACTIVE,
          },
        }),

        prisma.rental.count({
          where: {
            companyId,
            OR: [
              {
                status: RentalStatus.OVERDUE,
              },
              {
                rentalPayments: {
                  some: {
                    status: 'ATRASADO',
                  },
                },
              },
            ],
          },
        }),
      ]);

      /*
       * ============================================================
       * 4. FINANCEIRO
       * ============================================================
       *
       * O financeiro oficial do sistema está em
       * FinancialTransaction.
       */

      const [
        paidIncome,
        pendingIncome,
        overdueIncome,
        totalExpensesAggregate,
      ] = await Promise.all([
        prisma.financialTransaction.aggregate({
          where: {
            companyId,
            type: FinancialType.INCOME,
            status: FinancialStatus.PAID,
          },
          _sum: {
            paidAmount: true,
          },
        }),

        prisma.financialTransaction.aggregate({
          where: {
            companyId,
            type: FinancialType.INCOME,
            status: FinancialStatus.PENDING,
          },
          _sum: {
            remainingAmount: true,
          },
        }),

        prisma.financialTransaction.aggregate({
          where: {
            companyId,
            type: FinancialType.INCOME,
            status: FinancialStatus.OVERDUE,
          },
          _sum: {
            remainingAmount: true,
          },
        }),

        prisma.financialTransaction.aggregate({
          where: {
            companyId,
            type: FinancialType.EXPENSE,
          },
          _sum: {
            netAmount: true,
          },
        }),
      ]);

      const totalRevenue = decimalToNumber(
        paidIncome._sum.paidAmount,
      );

      const pendingRevenue = decimalToNumber(
        pendingIncome._sum.remainingAmount,
      );

      const overdueRevenue = decimalToNumber(
        overdueIncome._sum.remainingAmount,
      );

      const totalExpenses = decimalToNumber(
        totalExpensesAggregate._sum.netAmount,
      );

      const netProfit = Number(
        (totalRevenue - totalExpenses).toFixed(2),
      );

      /*
       * ============================================================
       * 5. UTILIZAÇÃO DA FROTA
       * ============================================================
       */

      const activeFleetTotal = totalVehicles - soldVehicles;

      const utilizationRate =
        activeFleetTotal > 0
          ? Math.round(
              (rentedVehicles / activeFleetTotal) * 100,
            )
          : 0;

      /*
       * ============================================================
       * 6. PRÓXIMOS VENCIMENTOS
       * ============================================================
       */

      const upcomingPayments = await prisma.rentalPayment.findMany({
        where: {
          status: {
            in: ['PENDENTE', 'ATRASADO'],
          },
          rental: {
            companyId,
          },
        },
        include: {
          rental: {
            include: {
              client: true,
              vehicle: true,
            },
          },
        },
        orderBy: {
          dataVencimento: 'asc',
        },
        take: 10,
      });

      const upcomingDuePayments = upcomingPayments.map((payment) => ({
        id: payment.id,
        rentalId: payment.rentalId,
        codigoContrato:
          payment.rental.codigoContrato ||
          payment.rental.rentalNumber ||
          'N/A',
        clienteNome:
          payment.rental.client?.name ||
          'CLIENTE NÃO IDENTIFICADO',
        clienteTelefone:
          payment.rental.client?.phone || '',
        veiculoModelo: payment.rental.vehicle
          ? `${payment.rental.vehicle.brand} ${payment.rental.vehicle.model}`
          : 'VEÍCULO NÃO IDENTIFICADO',
        veiculoPlaca:
          payment.rental.vehicle?.plate || '---',
        numeroParcela: payment.numeroParcela,
        dataVencimento: payment.dataVencimento,
        valor: decimalToNumber(payment.valor),
        status: payment.status,
        descricao: payment.descricao,
      }));

      /*
       * ============================================================
       * 7. LOCAÇÕES RECENTES
       * ============================================================
       */

      const recentRentalsData = await prisma.rental.findMany({
        where: {
          companyId,
        },
        include: {
          client: true,
          vehicle: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      });

      const recentRentals = recentRentalsData.map((rental) => ({
        id: rental.id,
        rentalNumber:
          rental.codigoContrato ||
          rental.rentalNumber,
        codigoContrato:
          rental.codigoContrato ||
          rental.rentalNumber,
        clientName:
          rental.client?.name || 'N/A',
        vehiclePlate:
          rental.vehicle?.plate || 'N/A',
        vehicleModel: rental.vehicle
          ? `${rental.vehicle.brand} ${rental.vehicle.model}`
          : 'N/A',
        startDate: rental.startDate,
        endDate: rental.endDate,
        amount: decimalToNumber(
          rental.valorPeriodo ?? rental.amount,
        ),
        billingFrequency:
          rental.billingFrequency,
        status: rental.status,
      }));

      /*
       * ============================================================
       * 8. MANUTENÇÕES URGENTES
       * ============================================================
       */

      const urgentMaintenancesData =
        await prisma.maintenance.findMany({
          where: {
            companyId,
            status: {
              in: [
                MaintenanceStatus.SCHEDULED,
                MaintenanceStatus.IN_PROGRESS,
                MaintenanceStatus.WAITING_PARTS,
              ],
            },
          },
          include: {
            vehicle: true,
          },
          orderBy: {
            dataAgendamento: 'asc',
          },
          take: 5,
        });

      const urgentMaintenances =
        urgentMaintenancesData.map((maintenance) => ({
          id: maintenance.id,
          vehiclePlate:
            maintenance.vehicle?.plate || 'N/A',
          vehicleModel: maintenance.vehicle
            ? `${maintenance.vehicle.brand} ${maintenance.vehicle.model}`
            : 'N/A',
          type: maintenance.type,
          description: maintenance.descricao,
          scheduledDate: maintenance.dataAgendamento,
          workshop:
            maintenance.workshop || 'N/A',
          cost: decimalToNumber(
            maintenance.custoTotal,
          ),
          status: maintenance.status,
        }));

      /*
       * ============================================================
       * 9. RESPOSTA
       * ============================================================
       */

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
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController =
  new DashboardController();
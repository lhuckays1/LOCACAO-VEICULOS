import { cashFlow } from '../services/cashflow.js';
import { financialRelations, serializeFinancial, tenantTransactions, validDate, money, validateFinancialLinks, settleFinancial } from '../services/financial.js';
import { HttpError } from '../utils/api-error.js';
import { Response, NextFunction } from 'express';

import {
  createFinancialTransactionSchema,
  updateFinancialTransactionSchema,
  settleTransactionSchema,
  cancelTransactionSchema,
  financialCategorySchema,
  costCenterSchema,
} from '../schemas/financial.schema.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { prisma } from '../config/prisma.js';
import { FinancialOrigin, FinancialStatus, FinancialType } from '@prisma/client';

export class FinancialController {
  /**
   * Helper to enrich a financial transaction with related entity data
   */
  private enrichTransaction(tx: Awaited<ReturnType<typeof tenantTransactions>>[number], _companyId: string) { return tx; }


/**
 * GET /api/financial/dashboard
 * Consolidated financial KPIs, charts data and upcoming maturities
 *
 * Este endpoint usa exclusivamente Prisma/Supabase.
 */
async getDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const companyId = req.user!.companyId;

    const transactions = await prisma.financialTransaction.findMany({
      where: {
        companyId,
        status: {
          not: FinancialStatus.CANCELLED,
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        costCenter: {
          select: {
            id: true,
            code: true,
            name: true,
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
        vehicle: {
          select: {
            id: true,
            plate: true,
            brand: true,
            model: true,
          },
        },
        rental: {
          select: {
            id: true,
            codigoContrato: true,
            rentalNumber: true,
          },
        },
      },
      orderBy: {
        dueDate: 'desc',
      },
    });

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentMonthPrefix = todayStr.substring(0, 7);

    const toNumber = (value: unknown): number => Number(value ?? 0);

    const toDateString = (value: Date): string =>
      value.toISOString().split('T')[0];

    const isCurrentMonth = (date: Date): boolean =>
      toDateString(date).startsWith(currentMonthPrefix);

    const round2 = (value: number): number => Number(value.toFixed(2));

    // Métricas do mês atual
    const currentMonthTx = transactions.filter((t) => isCurrentMonth(t.dueDate));

    const totalRevenueRealized = currentMonthTx
      .filter((t) => t.type === FinancialType.INCOME)
      .reduce((sum, t) => sum + toNumber(t.paidAmount), 0);

    const totalRevenuePending = currentMonthTx
      .filter(
        (t) =>
          t.type === FinancialType.INCOME &&
          (t.status === FinancialStatus.PENDING ||
            t.status === FinancialStatus.PARTIAL),
      )
      .reduce((sum, t) => sum + toNumber(t.remainingAmount), 0);

    const totalRevenueOverdue = transactions
      .filter(
        (t) =>
          t.type === FinancialType.INCOME &&
          t.status === FinancialStatus.OVERDUE,
      )
      .reduce((sum, t) => sum + toNumber(t.remainingAmount), 0);

    const totalExpensePaid = currentMonthTx
      .filter((t) => t.type === FinancialType.EXPENSE)
      .reduce((sum, t) => sum + toNumber(t.paidAmount), 0);

    const totalExpensePending = currentMonthTx
      .filter(
        (t) =>
          t.type === FinancialType.EXPENSE &&
          (t.status === FinancialStatus.PENDING ||
            t.status === FinancialStatus.PARTIAL ||
            t.status === FinancialStatus.OVERDUE),
      )
      .reduce((sum, t) => sum + toNumber(t.remainingAmount), 0);

    const netCashBalance = round2(totalRevenueRealized - totalExpensePaid);

    const projectedNetResult = round2(
      totalRevenueRealized +
        totalRevenuePending -
        (totalExpensePaid + totalExpensePending),
    );

    // Inadimplência global
    const overdueIncomeTransactions = transactions.filter(
      (t) =>
        t.type === FinancialType.INCOME &&
        t.status !== FinancialStatus.PAID &&
        (t.status === FinancialStatus.OVERDUE ||
          toDateString(t.dueDate) < todayStr),
    );

    const totalOverdueAmount = overdueIncomeTransactions.reduce(
      (sum, t) => sum + toNumber(t.remainingAmount),
      0,
    );

    const totalIncomeVolume = transactions
      .filter((t) => t.type === FinancialType.INCOME)
      .reduce((sum, t) => sum + toNumber(t.netAmount), 0);

    const defaultRate =
      totalIncomeVolume > 0
        ? Number(((totalOverdueAmount / totalIncomeVolume) * 100).toFixed(1))
        : 0;

    // Despesas por categoria
    const expenseByCategoryMap: Record<
      string,
      { name: string; color: string; amount: number }
    > = {};

    for (const t of transactions.filter(
      (item) => item.type === FinancialType.EXPENSE,
    )) {
      const catName = t.category?.name || 'DIVERSOS';
      const catColor = t.category?.color || '#94A3B8';

      if (!expenseByCategoryMap[catName]) {
        expenseByCategoryMap[catName] = {
          name: catName,
          color: catColor,
          amount: 0,
        };
      }

      expenseByCategoryMap[catName].amount +=
        toNumber(t.paidAmount) || toNumber(t.netAmount);
    }

    const expensesByCategory = Object.values(expenseByCategoryMap)
      .map((e) => ({ ...e, amount: round2(e.amount) }))
      .sort((a, b) => b.amount - a.amount);

    // Evolução mensal — últimos 6 meses
    const monthlyEvolution: {
      month: string;
      label: string;
      income: number;
      expense: number;
      balance: number;
    }[] = [];

    const dateCursor = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(
        dateCursor.getFullYear(),
        dateCursor.getMonth() - i,
        1,
      );

      const prefix = `${d.getFullYear()}-${String(
        d.getMonth() + 1,
      ).padStart(2, '0')}`;

      const monthLabel = d
        .toLocaleDateString('pt-BR', {
          month: 'short',
          year: '2-digit',
        })
        .toUpperCase();

      const monthIncome = transactions
        .filter(
          (t) =>
            t.type === FinancialType.INCOME &&
            toDateString(t.dueDate).startsWith(prefix),
        )
        .reduce((sum, t) => sum + toNumber(t.paidAmount), 0);

      const monthExpense = transactions
        .filter(
          (t) =>
            t.type === FinancialType.EXPENSE &&
            toDateString(t.dueDate).startsWith(prefix),
        )
        .reduce((sum, t) => sum + toNumber(t.netAmount), 0);

      monthlyEvolution.push({
        month: prefix,
        label: monthLabel,
        income: round2(monthIncome),
        expense: round2(monthExpense),
        balance: round2(monthIncome - monthExpense),
      });
    }

    // Próximos vencimentos — 15 dias
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 15);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const upcomingTransactions = transactions
      .filter((t) => {
        const dueDate = toDateString(t.dueDate);

        return (
          t.status !== FinancialStatus.PAID &&
          dueDate >= todayStr &&
          dueDate <= futureDateStr
        );
      })
      .sort((a, b) =>
        toDateString(a.dueDate).localeCompare(toDateString(b.dueDate)),
      )
      .map((t) => {
        const dueDate = toDateString(t.dueDate);
        const remainingAmount = toNumber(t.remainingAmount);

        return {
          id: t.id,
          companyId: t.companyId,
          type: t.type,
          origin: t.origin,
          description: t.description,
          categoryId: t.categoryId,
          costCenterId: t.costCenterId,
          clientId: t.clientId,
          vehicleId: t.vehicleId,
          rentalId: t.rentalId,
          rentalPaymentId: t.rentalPaymentId,
          maintenanceId: t.maintenanceId,
          recurringId: t.recurringId,
          grossAmount: toNumber(t.grossAmount),
          discountAmount: toNumber(t.discountAmount),
          interestAmount: toNumber(t.interestAmount),
          netAmount: toNumber(t.netAmount),
          paidAmount: toNumber(t.paidAmount),
          remainingAmount,
          competencyDate: t.competencyDate,
          dueDate: t.dueDate,
          settlementDate: t.settlementDate,
          paymentMethod: t.paymentMethod,
          status: t.status,
          isRecurring: t.isRecurring,
          installmentNumber: t.installmentNumber,
          totalInstallments: t.totalInstallments,
          receiptUrl: t.receiptUrl,
          notes: t.notes,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,

          clientName: t.client?.name || null,
          clientDocument: t.client?.cpfCnpj || null,
          clientPhone: t.client?.phone || null,

          vehiclePlate: t.vehicle?.plate || null,
          vehicleModel: t.vehicle
            ? `${t.vehicle.brand} ${t.vehicle.model}`
            : null,

          categoryName: t.category?.name || 'SEM CATEGORIA',
          categoryColor: t.category?.color || '#64748B',

          costCenterName: t.costCenter?.name || 'GERAL',
          costCenterCode: t.costCenter?.code || '000',

          contractNumber: t.rental
            ? t.rental.codigoContrato || t.rental.rentalNumber
            : null,

          daysOverdue: 0,
          suggestedFine: 0,
          suggestedInterest: 0,
          suggestedTotalToPay: round2(remainingAmount),
        };
      });

    res.json({
      summary: {
        currentMonth: currentMonthPrefix,
        totalRevenueRealized: round2(totalRevenueRealized),
        totalRevenuePending: round2(totalRevenuePending),
        totalRevenueOverdue: round2(totalRevenueOverdue),
        totalExpensePaid: round2(totalExpensePaid),
        totalExpensePending: round2(totalExpensePending),
        netCashBalance,
        projectedNetResult,
        totalOverdueAmount: round2(totalOverdueAmount),
        defaultRate,
      },
      monthlyEvolution,
      expensesByCategory,
      upcomingTransactions,
    });
  } catch (err) {
    next(err);
  }
}

  /**
   * GET /api/financial/transactions
   * Search and filter transactions
   */
  async listTransactions(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;

      const {
        type,
        status,
        origin,
        categoryId,
        costCenterId,
        clientId,
        vehicleId,
        rentalId,
        startDate,
        endDate,
        search,
      } = req.query;

      const where: any = {
        companyId,
      };

      if (type && type !== 'ALL') {
        where.type = String(type) as FinancialType;
      }

      if (status && status !== 'ALL') {
        where.status = String(status) as FinancialStatus;
      }

      if (origin && origin !== 'ALL') {
        where.origin = String(origin) as FinancialOrigin;
      }

      if (categoryId && categoryId !== 'ALL') {
        where.categoryId = String(categoryId);
      }

      if (costCenterId && costCenterId !== 'ALL') {
        where.costCenterId = String(costCenterId);
      }

      if (clientId) {
        where.clientId = String(clientId);
      }

      if (vehicleId) {
        where.vehicleId = String(vehicleId);
      }

      if (rentalId) {
        where.rentalId = String(rentalId);
      }

      if (startDate || endDate) {
        where.dueDate = {};

        if (startDate) {
          where.dueDate.gte = new Date(`${String(startDate)}T00:00:00`);
        }

        if (endDate) {
          where.dueDate.lte = new Date(`${String(endDate)}T23:59:59.999`);
        }
      }

      if (search) {
        const q = String(search).trim();

        if (q) {
          where.OR = [
            {
              description: {
                contains: q,
                mode: 'insensitive',
              },
            },
            {
              notes: {
                contains: q,
                mode: 'insensitive',
              },
            },
            {
              client: {
                name: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
            },
            {
              vehicle: {
                plate: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
            },
          ];

        }
      }

      const transactions = await prisma.financialTransaction.findMany({
        where,
        include: {
          category: true,
          costCenter: true,
          client: true,
          vehicle: true,
          rental: true,
        },
        orderBy: {
          dueDate: 'desc',
        },
      });

      const data = transactions.map((tx) => ({
        id: tx.id,
        tenantId: companyId,
        companyId: tx.companyId,
        type: tx.type,
        origin: tx.origin,
        description: tx.description,
        categoryId: tx.categoryId,
        categoryName: tx.category?.name ?? null,
        categoryColor: tx.category?.color ?? null,
        costCenterId: tx.costCenterId,
        costCenterName: tx.costCenter?.name ?? null,
        clientId: tx.clientId,
        clientName: tx.client?.name ?? null,
        clientPhone: tx.client?.phone ?? null,
        vehicleId: tx.vehicleId,
        vehicleName: tx.vehicle
          ? `${tx.vehicle.brand ?? ''} ${tx.vehicle.model ?? ''}`.trim()
          : null,
        vehiclePlate: tx.vehicle?.plate ?? null,
        rentalId: tx.rentalId,
        rentalNumber: tx.rental?.rentalNumber ?? tx.rental?.codigoContrato ?? null,
        rentalPaymentId: tx.rentalPaymentId,
        recurringId: tx.recurringId,
        grossAmount: Number(tx.grossAmount),
        discountAmount: Number(tx.discountAmount),
        interestAmount: Number(tx.interestAmount),
        netAmount: Number(tx.netAmount),
        paidAmount: Number(tx.paidAmount),
        remainingAmount: Number(tx.remainingAmount),
        competencyDate: tx.competencyDate,
        dueDate: tx.dueDate,
        settlementDate: tx.settlementDate,
        paymentMethod: tx.paymentMethod,
        status: tx.status,
        isRecurring: tx.isRecurring,
        installmentNumber: tx.installmentNumber,
        totalInstallments: tx.totalInstallments,
        receiptUrl: tx.receiptUrl,
        notes: tx.notes,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
      }));

      res.json({
        total: data.length,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/financial/receivables
   * Shortcut for accounts receivable (Contas a Receber)
   */
    /**
   * GET /api/financial/receivables
   * Contas a Receber usando Prisma/Supabase
   */
  async getReceivables(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
      try {
        const companyId = req.user!.companyId;

        const {
          status,
          clientId,
          vehicleId,
          startDate,
          endDate,
          search,
        } = req.query;

        const where: any = {
          companyId,
          type: FinancialType.INCOME,
        };

        // Filtro por status
        if (status && status !== 'ALL') {
          where.status = String(status) as FinancialStatus;
        }

        // Filtro por cliente
        if (clientId) {
          where.clientId = String(clientId);
        }

        // Filtro por veículo
        if (vehicleId) {
          where.vehicleId = String(vehicleId);
        }

        // Filtro por período
        if (startDate) {
          where.dueDate = {
            ...(where.dueDate || {}),
            gte: new Date(`${String(startDate)}T00:00:00.000Z`),
          };
        }

        if (endDate) {
          where.dueDate = {
            ...(where.dueDate || {}),
            lte: new Date(`${String(endDate)}T23:59:59.999Z`),
          };
        }

        // Pesquisa por descrição, cliente, veículo ou contrato
        if (search) {
          const q = String(search).trim();

          if (q) {
            where.OR = [
              {
                description: {
                  contains: q,
                  mode: 'insensitive',
                },
              },
              {
                client: {
                  is: {
                    name: {
                      contains: q,
                      mode: 'insensitive',
                    },
                  },
                },
              },
              {
                vehicle: {
                  is: {
                    plate: {
                      contains: q,
                      mode: 'insensitive',
                    },
                  },
                },
              },
              {
                rental: {
                  is: {
                    OR: [
                      {
                        codigoContrato: {
                          contains: q,
                          mode: 'insensitive',
                        },
                      },
                      {
                        rentalNumber: {
                          contains: q,
                          mode: 'insensitive',
                        },
                      },
                    ],
                  },
                },
              },
            ];
          }
        }

        const transactions = await prisma.financialTransaction.findMany({
          where,
          include: {
            category: true,
            costCenter: true,
            client: true,
            vehicle: true,
            rental: true,
          },
          orderBy: {
            dueDate: 'asc',
          },
        });

        const data = transactions.map((tx) => {
          const netAmount = Number(tx.netAmount);
          const paidAmount = Number(tx.paidAmount);
          const remainingAmount = Number(tx.remainingAmount);

          const dueDate = tx.dueDate.toISOString().split('T')[0];
          const todayStr = new Date().toISOString().split('T')[0];

          let daysOverdue = 0;

          if (
            tx.status !== FinancialStatus.PAID &&
            tx.status !== FinancialStatus.CANCELLED &&
            dueDate < todayStr
          ) {
            const dueTime = new Date(`${dueDate}T00:00:00`).getTime();
            const todayTime = new Date(`${todayStr}T00:00:00`).getTime();

            daysOverdue = Math.max(
              0,
              Math.floor(
                (todayTime - dueTime) / (1000 * 60 * 60 * 24)
              )
            );
          }

          let suggestedFine = 0;
          let suggestedInterest = 0;

          if (daysOverdue > 0 && remainingAmount > 0) {
            suggestedFine = Number(
              (remainingAmount * 0.02).toFixed(2)
            );

            suggestedInterest = Number(
              ((remainingAmount * 0.01 * daysOverdue) / 30).toFixed(2)
            );
          }

          return {
            id: tx.id,
            companyId: tx.companyId,

            type: tx.type,
            origin: tx.origin,

            description: tx.description,

            categoryId: tx.categoryId,
            categoryName: tx.category?.name || 'SEM CATEGORIA',
            categoryColor: tx.category?.color || '#64748B',

            costCenterId: tx.costCenterId,
            costCenterName: tx.costCenter?.name || 'GERAL',
            costCenterCode: tx.costCenter?.code || '000',

            clientId: tx.clientId,
            clientName: tx.client?.name || null,
            clientDocument: tx.client?.cpfCnpj || null,
            clientPhone: tx.client?.phone || null,

            vehicleId: tx.vehicleId,
            vehiclePlate: tx.vehicle?.plate || null,
            vehicleModel: tx.vehicle
              ? `${tx.vehicle.brand} ${tx.vehicle.model}`
              : null,

            rentalId: tx.rentalId,
            contractNumber: tx.rental
              ? (tx.rental.codigoContrato || tx.rental.rentalNumber)
              : null,

            grossAmount: Number(tx.grossAmount),
            discountAmount: Number(tx.discountAmount),
            interestAmount: Number(tx.interestAmount),

            netAmount,
            paidAmount,
            remainingAmount,

            dueDate,
            competencyDate: tx.competencyDate.toISOString(),
            settlementDate: tx.settlementDate
              ? tx.settlementDate.toISOString()
              : null,

            paymentMethod: tx.paymentMethod,
            status: tx.status,

            installmentNumber: tx.installmentNumber,
            totalInstallments: tx.totalInstallments,

            notes: tx.notes,

            isRecurring: tx.isRecurring,

            daysOverdue,
            suggestedFine,
            suggestedInterest,
            suggestedTotalToPay: Number(
              (
                remainingAmount +
                suggestedFine +
                suggestedInterest
              ).toFixed(2)
            ),

            createdAt: tx.createdAt.toISOString(),
            updatedAt: tx.updatedAt.toISOString(),
          };
        });

        const totalPending = data
          .filter(
            (t) =>
              t.status === FinancialStatus.PENDING ||
              t.status === FinancialStatus.PARTIAL
          )
          .reduce(
            (sum, t) => sum + t.remainingAmount,
            0
          );

        const totalOverdue = data
          .filter(
            (t) => t.status === FinancialStatus.OVERDUE
          )
          .reduce(
            (sum, t) => sum + t.remainingAmount,
            0
          );

        const totalReceived = data
          .filter(
            (t) => t.status === FinancialStatus.PAID
          )
          .reduce(
            (sum, t) => sum + t.paidAmount,
            0
          );

        res.json({
          metrics: {
            totalPending: Number(totalPending.toFixed(2)),
            totalOverdue: Number(totalOverdue.toFixed(2)),
            totalReceived: Number(totalReceived.toFixed(2)),
            count: data.length,
          },
          data,
        });
      } catch (err) {
        next(err);
      }
    }

  /**
   * GET /api/financial/payables
   * Shortcut for accounts payable (Contas a Pagar)
   */
  async getPayables(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;


      const { status, categoryId, costCenterId, vehicleId, startDate, endDate, search } = req.query;

      let result = (await tenantTransactions(companyId)).filter(
        (t) => (t.tenantId === companyId || t.companyId === companyId) && t.type === 'EXPENSE'
      );

      if (status && status !== 'ALL') {
        result = result.filter((t) => t.status === status);
      }
      if (categoryId && categoryId !== 'ALL') {
        result = result.filter((t) => t.categoryId === categoryId);
      }
      if (costCenterId && costCenterId !== 'ALL') {
        result = result.filter((t) => t.costCenterId === costCenterId);
      }
      if (vehicleId) {
        result = result.filter((t) => t.vehicleId === vehicleId);
      }
      if (startDate) {
        result = result.filter((t) => t.dueDate >= String(startDate));
      }
      if (endDate) {
        result = result.filter((t) => t.dueDate <= String(endDate));
      }
      if (search) {
        const q = String(search).trim().toUpperCase();
        result = result.filter((t) => t.description.toUpperCase().includes(q));
      }

      result.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

      const totalPending = result
        .filter((t) => t.status === 'PENDING' || t.status === 'PARTIAL')
        .reduce((sum, t) => sum + t.remainingAmount, 0);

      const totalOverdue = result
        .filter((t) => t.status === 'OVERDUE')
        .reduce((sum, t) => sum + t.remainingAmount, 0);

      const totalPaid = result
        .filter((t) => t.status === 'PAID')
        .reduce((sum, t) => sum + t.paidAmount, 0);

      const enriched = result.map((t) => this.enrichTransaction(t, companyId));

      res.json({
        metrics: {
          totalPending: Number(totalPending.toFixed(2)),
          totalOverdue: Number(totalOverdue.toFixed(2)),
          totalPaid: Number(totalPaid.toFixed(2)),
          count: enriched.length,
        },
        data: enriched,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/financial/transactions/:id
   * Get transaction details and settlements history
   */
  async getTransactionById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const tx = await prisma.financialTransaction.findFirst({
        where: {
          id,
          companyId,
        },
        include: {
          category: true,
          costCenter: true,
          client: true,
          vehicle: true,
          rental: true,
        },
      });

      if (!tx) {
        res.status(404).json({
          error: 'TRANSACTION_NOT_FOUND',
          message: 'Lançamento financeiro não encontrado.',
        });
        return;
      }

      const settlements = await prisma.financialSettlement.findMany({
        where: {
          transactionId: tx.id,
        },
        include: {
          user: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          paymentDate: 'desc',
        },
      });

      const enriched = {
        id: tx.id,
        tenantId: companyId,
        companyId: tx.companyId,
        type: tx.type,
        origin: tx.origin,
        description: tx.description,
        categoryId: tx.categoryId,
        categoryName: tx.category?.name ?? null,
        categoryColor: tx.category?.color ?? null,
        costCenterId: tx.costCenterId,
        costCenterName: tx.costCenter?.name ?? null,
        clientId: tx.clientId,
        clientName: tx.client?.name ?? null,
        clientPhone: tx.client?.phone ?? null,
        vehicleId: tx.vehicleId,
        vehicleName: tx.vehicle
          ? `${tx.vehicle.brand ?? ''} ${tx.vehicle.model ?? ''}`.trim()
          : null,
        vehiclePlate: tx.vehicle?.plate ?? null,
        rentalId: tx.rentalId,
        rentalNumber: tx.rental?.rentalNumber ?? tx.rental?.codigoContrato ?? null,
        rentalPaymentId: tx.rentalPaymentId,
        recurringId: tx.recurringId,
        grossAmount: Number(tx.grossAmount),
        discountAmount: Number(tx.discountAmount),
        interestAmount: Number(tx.interestAmount),
        netAmount: Number(tx.netAmount),
        paidAmount: Number(tx.paidAmount),
        remainingAmount: Number(tx.remainingAmount),
        competencyDate: tx.competencyDate,
        dueDate: tx.dueDate,
        settlementDate: tx.settlementDate,
        paymentMethod: tx.paymentMethod,
        status: tx.status,
        isRecurring: tx.isRecurring,
        installmentNumber: tx.installmentNumber,
        totalInstallments: tx.totalInstallments,
        receiptUrl: tx.receiptUrl,
        notes: tx.notes,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
      };

      res.json({
        data: {
          ...enriched,
          settlements: settlements.map((settlement) => ({
            ...settlement,
            amount: Number(settlement.amount),
            interest: Number(settlement.interest),
            fine: Number(settlement.fine),
            discount: Number(settlement.discount),
            userName: settlement.user?.name ?? 'SISTEMA',
          })),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/financial/transactions
   * Create a manual transaction (e.g. Extra revenue, Expense, IPVA, Salary)
   */
  async createTransaction(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId!;
      const data = createFinancialTransactionSchema.parse(req.body);
      const dueDate = validDate(data.dueDate);
      const competencyDate = validDate(data.competencyDate || data.dueDate);
      const netAmount = money(data.grossAmount).minus(money(data.discountAmount || 0)).plus(money(data.interestAmount || 0));
      if (netAmount.lte(0)) throw new HttpError(400, 'O valor líquido deve ser positivo.');
      const created = await prisma.$transaction(async tx => {
        await validateFinancialLinks(tx, companyId, data);
        const record = await tx.financialTransaction.create({ data: {
          ...data, companyId, categoryId: data.categoryId || null, costCenterId: data.costCenterId || null,
          clientId: data.clientId || null, vehicleId: data.vehicleId || null, rentalId: data.rentalId || null,
          rentalPaymentId: null, description: data.description.toUpperCase(),
          dueDate, competencyDate, netAmount, remainingAmount: netAmount,
          status: dueDate < validDate(new Date().toISOString()) ? 'OVERDUE' : 'PENDING',
        }, include: financialRelations });
        await tx.auditLog.create({ data: { companyId, userId: req.user!.userId, action: 'CREATE', entity: 'FINANCIAL_TRANSACTION', entityId: record.id } });
        return record;
      });
      res.status(201).json({ message: 'Lançamento registrado com sucesso!', data: serializeFinancial(created) });
    } catch (err) { next(err); }
  }

  /**
   * POST /api/financial/transactions/:id/settle
   * Liquidate / Pay transaction (supports partial and full settlement)
   */
  async settleTransaction(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId!;
      const result = await settleFinancial(req.params.id, companyId, req.user!.userId, settleTransactionSchema.parse(req.body));
      res.json({ message: 'Baixa confirmada com sucesso!', data: result });
    } catch (err) { next(err); }
  }

  /**
   * POST /api/financial/transactions/:id/cancel
   * Cancel a transaction
   */
  async cancelTransaction(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId!;
      const data = cancelTransactionSchema.parse(req.body);
      const record = await prisma.$transaction(async tx => {
        const id = req.params.id;
        await tx.$queryRaw`SELECT id FROM financial_transactions WHERE id = ${id} AND "companyId" = ${companyId} FOR UPDATE`;
        const current = await tx.financialTransaction.findFirst({ where: { id, companyId }, include: { settlements: true } });
        if (!current) throw new HttpError(404, 'Lançamento não encontrado.');
        if (Number(current.paidAmount) > 0 || current.settlements.length) throw new HttpError(409, 'Lançamento com baixa exige estorno antes do cancelamento.');
        const updated = await tx.financialTransaction.update({ where: { id }, data: { status: 'CANCELLED',
          notes: [current.notes, `CANCELAMENTO: ${data.reason || 'SEM JUSTIFICATIVA'}`].filter(Boolean).join(' | ') }, include: financialRelations });
        if (current.rentalPaymentId) await tx.rentalPayment.updateMany({ where: { id: current.rentalPaymentId, tenantId: companyId }, data: { status: 'CANCELADO' } });
        await tx.auditLog.create({ data: { companyId, userId: req.user!.userId, action: 'CANCEL', entity: 'FINANCIAL_TRANSACTION', entityId: id } });
        return updated;
      });
      res.json({ message: 'Lançamento cancelado.', data: serializeFinancial(record) });
    } catch (err) { next(err); }
  }

  /**
   * GET /api/financial/cashflow
   * Detailed cash flow analysis (Daily / Weekly / Monthly breakdown)
   */
  async getCashFlow(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { startDate, endDate, viewMode = 'DAILY' } = req.query;



      const today = new Date();
      const start = startDate ? String(startDate) : new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const end = endDate ? String(endDate) : new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

      const transactions = (await tenantTransactions(companyId)).filter(
        (t) => (t.tenantId === companyId || t.companyId === companyId) && t.status !== 'CANCELLED'
      );

      res.json(cashFlow(transactions, start, end));
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/financial/overdue
   * Overdue debtors analysis & collection tools
   */
  async getOverdue(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;


      const todayStr = new Date().toISOString().split('T')[0];

      const overdueTx = (await tenantTransactions(companyId)).filter(
        (t) =>
          (t.tenantId === companyId || t.companyId === companyId) &&
          t.type === 'INCOME' &&
          t.status !== 'CANCELLED' &&
          t.status !== 'PAID' &&
          t.dueDate < todayStr
      );

      // Group by client
      const clientMap: Record<string, {
        client: any;
        totalOverdue: number;
        titlesCount: number;
        oldestDueDate: string;
        maxDaysOverdue: number;
        transactions: any[];
      }> = {};

      for (const tx of overdueTx) {
        const enriched = this.enrichTransaction(tx, companyId);
        const clientId = tx.clientId || 'UNKNOWN';

        if (!clientMap[clientId]) {
          const client = tx.client;
          clientMap[clientId] = {
            client: client || {
              id: 'UNKNOWN',
              name: 'CLIENTE NÃO VINCULADO',
              cpfCnpj: '---',
              phone: '---',
              email: '---',
            },
            totalOverdue: 0,
            titlesCount: 0,
            oldestDueDate: tx.dueDate,
            maxDaysOverdue: enriched.daysOverdue,
            transactions: [],
          };
        }

        clientMap[clientId].totalOverdue += tx.remainingAmount;
        clientMap[clientId].titlesCount += 1;
        if (tx.dueDate < clientMap[clientId].oldestDueDate) {
          clientMap[clientId].oldestDueDate = tx.dueDate;
        }
        if (enriched.daysOverdue > clientMap[clientId].maxDaysOverdue) {
          clientMap[clientId].maxDaysOverdue = enriched.daysOverdue;
        }
        clientMap[clientId].transactions.push(enriched);
      }

      const debtorsList = Object.values(clientMap)
        .map((d) => {
          // Format suggested WhatsApp message
          const clientName = d.client.name.split(' ')[0] || 'Cliente';
          const suggestedWhatsApp = encodeURIComponent(
            `Olá, ${clientName}! Notamos uma pendência em seu contrato de locação junto à Frota Prime no valor total de R$ ${d.totalOverdue.toFixed(
              2
            )} (vencida desde ${d.oldestDueDate}). Por favor, entre em contato para regularizarmos sua locação e mantermos o veículo ativo.`
          );

          return {
            ...d,
            totalOverdue: Number(d.totalOverdue.toFixed(2)),
            suggestedWhatsAppText: `Olá, ${clientName}! Notamos uma pendência em seu contrato de locação junto à Frota Prime no valor total de R$ ${d.totalOverdue.toFixed(
              2
            )} (vencida desde ${d.oldestDueDate}). Por favor, entre em contato para regularizarmos sua locação e mantermos o veículo ativo.`,
            whatsAppLink: d.client.phone ? `https://wa.me/55${d.client.phone.replace(/\D/g, '')}?text=${suggestedWhatsApp}` : null,
          };
        })
        .sort((a, b) => b.totalOverdue - a.totalOverdue);

      const totalOverdueSum = debtorsList.reduce((acc, d) => acc + d.totalOverdue, 0);

      res.json({
        totalOverdueSum: Number(totalOverdueSum.toFixed(2)),
        totalDebtors: debtorsList.length,
        debtors: debtorsList,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/financial/vehicle/:id
   * Financial Statement for a specific Vehicle (ROI / Margem)
   */
  async getVehicleStatement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const vehicle = await prisma.vehicle.findFirst({ where: { id, companyId } });
      if (!vehicle) {
        res.status(404).json({ error: 'VEHICLE_NOT_FOUND', message: 'Veículo não encontrado.' });
        return;
      }

      const transactions = (await tenantTransactions(companyId))
        .filter((t) => t.vehicleId === id && t.status !== 'CANCELLED')
        .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
        .map((t) => this.enrichTransaction(t, companyId));

      const totalIncome = transactions
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.paidAmount, 0);

      const totalPendingIncome = transactions
        .filter((t) => t.type === 'INCOME' && t.status !== 'PAID')
        .reduce((sum, t) => sum + t.remainingAmount, 0);

      const totalExpense = transactions
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + (t.paidAmount || t.netAmount), 0);

      const netProfit = Number((totalIncome - totalExpense).toFixed(2));

      res.json({
        vehicle: {
          id: vehicle.id,
          plate: vehicle.plate,
          brand: vehicle.brand,
          model: vehicle.model,
          currentMileage: vehicle.currentMileage,
          purchaseValue: vehicle.purchaseValue,
        },
        financials: {
          totalIncome: Number(totalIncome.toFixed(2)),
          totalPendingIncome: Number(totalPendingIncome.toFixed(2)),
          totalExpense: Number(totalExpense.toFixed(2)),
          netProfit,
        },
        transactions,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Categories CRUD
   */
  async listCategories(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId!;
      const data = await prisma.financialCategory.findMany({ where: { companyId, active: true }, orderBy: { name: 'asc' } });
      const filtered = data.filter(c => !req.query.type || req.query.type === "ALL" || c.type === req.query.type);
      res.json({ total: filtered.length, data: filtered });
    } catch (err) { next(err); }
  }

  async createCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId!;
      const data = financialCategorySchema.parse(req.body);
      const record = await prisma.financialCategory.create({ data: { ...data, name: data.name.toUpperCase(), companyId } });
      res.status(201).json({ message: 'Categoria cadastrado.', data: record });
    } catch (err) { next(err); }
  }

  async deleteCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId!;
      const record = await prisma.financialCategory.findFirst({ where: { id: req.params.id, companyId } });
      if (!record) throw new HttpError(404, 'Categoria não encontrado.');
      // Preserve accounting history; inactive entries are no longer offered for new records.
      await prisma.financialCategory.update({ where: { id: record.id }, data: { active: false } });
      res.json({ message: 'Categoria removido.' });
    } catch (err) { next(err); }
  }

  /**
   * Cost Centers CRUD
   */
  async listCostCenters(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId!;
      const data = await prisma.costCenter.findMany({ where: { companyId, active: true }, orderBy: { code: 'asc' } });
      const filtered = data;
      res.json({ total: filtered.length, data: filtered });
    } catch (err) { next(err); }
  }

  async createCostCenter(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId!;
      const data = costCenterSchema.parse(req.body);
      const record = await prisma.costCenter.create({ data: { ...data, name: data.name.toUpperCase(), companyId } });
      res.status(201).json({ message: 'Centro de custo cadastrado.', data: record });
    } catch (err) { next(err); }
  }

  async deleteCostCenter(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId!;
      const record = await prisma.costCenter.findFirst({ where: { id: req.params.id, companyId } });
      if (!record) throw new HttpError(404, 'Centro de custo não encontrado.');
      // Preserve accounting history; inactive entries are no longer offered for new records.
      await prisma.costCenter.update({ where: { id: record.id }, data: { active: false } });
      res.json({ message: 'Centro de custo removido.' });
    } catch (err) { next(err); }
  }
}

export const financialController = new FinancialController();

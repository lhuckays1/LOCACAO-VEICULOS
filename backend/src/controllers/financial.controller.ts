import { Response, NextFunction } from 'express';
import {
  db,
  generateUUID,
  FinancialTransaction,
  FinancialCategory,
  CostCenter,
  FinancialPaymentMethod,
} from '../db/store.js';
import {
  createFinancialTransactionSchema,
  updateFinancialTransactionSchema,
  settleTransactionSchema,
  cancelTransactionSchema,
  financialCategorySchema,
  costCenterSchema,
} from '../schemas/financial.schema.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export class FinancialController {
  /**
   * Helper to enrich a financial transaction with related entity data
   */
  private enrichTransaction(tx: FinancialTransaction, companyId: string) {
    const todayStr = new Date().toISOString().split('T')[0];
    const client = tx.clientId ? db.clients.find((c) => c.id === tx.clientId) : null;
    const vehicle = tx.vehicleId ? db.vehicles.find((v) => v.id === tx.vehicleId) : null;
    const category = tx.categoryId ? db.financialCategories.find((c) => c.id === tx.categoryId) : null;
    const costCenter = tx.costCenterId ? db.costCenters.find((cc) => cc.id === tx.costCenterId) : null;
    const rental = tx.rentalId ? db.rentals.find((r) => r.id === tx.rentalId) : null;

    // Calculate days overdue
    let daysOverdue = 0;
    if (tx.status !== 'PAID' && tx.status !== 'CANCELLED' && tx.dueDate < todayStr) {
      const dueTime = new Date(`${tx.dueDate}T00:00:00`).getTime();
      const todayTime = new Date(`${todayStr}T00:00:00`).getTime();
      daysOverdue = Math.max(0, Math.floor((todayTime - dueTime) / (1000 * 60 * 60 * 24)));
    }

    // Calculate suggested late interest (2% fine + 1% interest per month)
    let suggestedFine = 0;
    let suggestedInterest = 0;
    if (daysOverdue > 0 && tx.remainingAmount > 0) {
      suggestedFine = Number((tx.remainingAmount * 0.02).toFixed(2));
      suggestedInterest = Number(((tx.remainingAmount * 0.01 * daysOverdue) / 30).toFixed(2));
    }

    return {
      ...tx,
      clientName: client ? client.name : null,
      clientDocument: client ? client.cpfCnpj : null,
      clientPhone: client ? client.phone : null,
      vehiclePlate: vehicle ? vehicle.plate : null,
      vehicleModel: vehicle ? `${vehicle.brand} ${vehicle.model}` : null,
      categoryName: category ? category.name : 'SEM CATEGORIA',
      categoryColor: category?.color || '#64748B',
      costCenterName: costCenter ? costCenter.name : 'GERAL',
      costCenterCode: costCenter ? costCenter.code : '000',
      contractNumber: rental ? (rental.codigoContrato || rental.rentalNumber) : null,
      daysOverdue,
      suggestedFine,
      suggestedInterest,
      suggestedTotalToPay: Number((tx.remainingAmount + suggestedFine + suggestedInterest).toFixed(2)),
    };
  }

  /**
   * GET /api/financial/dashboard
   * Consolidated financial KPIs, charts data and upcoming maturities
   */
  async getDashboard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      db.updateFinancialStatuses();

      const transactions = db.financialTransactions.filter(
        (t) => (t.tenantId === companyId || t.companyId === companyId) && t.status !== 'CANCELLED'
      );

      const todayStr = new Date().toISOString().split('T')[0];
      const currentMonthPrefix = todayStr.substring(0, 7); // e.g., '2026-09'

      // Metrics of current month
      const currentMonthTx = transactions.filter((t) => t.dueDate.startsWith(currentMonthPrefix));

      const totalRevenueRealized = currentMonthTx
        .filter((t) => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.paidAmount, 0);

      const totalRevenuePending = currentMonthTx
        .filter((t) => t.type === 'INCOME' && (t.status === 'PENDING' || t.status === 'PARTIAL'))
        .reduce((sum, t) => sum + t.remainingAmount, 0);

      const totalRevenueOverdue = transactions
        .filter((t) => t.type === 'INCOME' && t.status === 'OVERDUE')
        .reduce((sum, t) => sum + t.remainingAmount, 0);

      const totalExpensePaid = currentMonthTx
        .filter((t) => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + t.paidAmount, 0);

      const totalExpensePending = currentMonthTx
        .filter((t) => t.type === 'EXPENSE' && (t.status === 'PENDING' || t.status === 'PARTIAL' || t.status === 'OVERDUE'))
        .reduce((sum, t) => sum + t.remainingAmount, 0);

      const netCashBalance = Number((totalRevenueRealized - totalExpensePaid).toFixed(2));
      const projectedNetResult = Number(
        (totalRevenueRealized + totalRevenuePending - (totalExpensePaid + totalExpensePending)).toFixed(2)
      );

      // Inadimplência Global
      const totalOverdueAmount = transactions
        .filter((t) => t.type === 'INCOME' && (t.status === 'OVERDUE' || (t.dueDate < todayStr && t.status !== 'PAID')))
        .reduce((sum, t) => sum + t.remainingAmount, 0);

      const allActiveIncomes = transactions.filter((t) => t.type === 'INCOME');
      const totalIncomeVolume = allActiveIncomes.reduce((sum, t) => sum + t.netAmount, 0);
      const defaultRate = totalIncomeVolume > 0
        ? Number(((totalOverdueAmount / totalIncomeVolume) * 100).toFixed(1))
        : 0;

      // Expenses by Category
      const expenseByCategoryMap: Record<string, { name: string; color: string; amount: number }> = {};
      const expenseTx = transactions.filter((t) => t.type === 'EXPENSE');
      for (const t of expenseTx) {
        const cat = t.categoryId ? db.financialCategories.find((c) => c.id === t.categoryId) : null;
        const catName = cat ? cat.name : 'DIVERSOS';
        const catColor = cat?.color || '#94A3B8';
        if (!expenseByCategoryMap[catName]) {
          expenseByCategoryMap[catName] = { name: catName, color: catColor, amount: 0 };
        }
        expenseByCategoryMap[catName].amount += (t.paidAmount || t.netAmount);
      }
      const expensesByCategory = Object.values(expenseByCategoryMap)
        .map((e) => ({ ...e, amount: Number(e.amount.toFixed(2)) }))
        .sort((a, b) => b.amount - a.amount);

      // Monthly Evolution (Last 6 months)
      const monthlyEvolution: { month: string; label: string; income: number; expense: number; balance: number }[] = [];
      const dateCursor = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(dateCursor.getFullYear(), dateCursor.getMonth() - i, 1);
        const prefix = d.toISOString().substring(0, 7);
        const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).toUpperCase();

        const monthIncome = transactions
          .filter((t) => t.type === 'INCOME' && t.dueDate.startsWith(prefix))
          .reduce((sum, t) => sum + t.paidAmount, 0);

        const monthExpense = transactions
          .filter((t) => t.type === 'EXPENSE' && t.dueDate.startsWith(prefix))
          .reduce((sum, t) => sum + t.paidAmount, 0);

        monthlyEvolution.push({
          month: prefix,
          label: monthLabel,
          income: Number(monthIncome.toFixed(2)),
          expense: Number(monthExpense.toFixed(2)),
          balance: Number((monthIncome - monthExpense).toFixed(2)),
        });
      }

      // Upcoming Maturities (Next 15 days)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const upcomingTransactions = transactions
        .filter((t) => t.status !== 'PAID' && t.dueDate >= todayStr && t.dueDate <= futureDateStr)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .map((t) => this.enrichTransaction(t, companyId));

      res.json({
        summary: {
          currentMonth: currentMonthPrefix,
          totalRevenueRealized: Number(totalRevenueRealized.toFixed(2)),
          totalRevenuePending: Number(totalRevenuePending.toFixed(2)),
          totalRevenueOverdue: Number(totalRevenueOverdue.toFixed(2)),
          totalExpensePaid: Number(totalExpensePaid.toFixed(2)),
          totalExpensePending: Number(totalExpensePending.toFixed(2)),
          netCashBalance,
          projectedNetResult,
          totalOverdueAmount: Number(totalOverdueAmount.toFixed(2)),
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
      db.updateFinancialStatuses();

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

      let result = db.financialTransactions.filter(
        (t) => t.tenantId === companyId || t.companyId === companyId
      );

      if (type && type !== 'ALL') {
        result = result.filter((t) => t.type === type);
      }

      if (status && status !== 'ALL') {
        result = result.filter((t) => t.status === status);
      }

      if (origin && origin !== 'ALL') {
        result = result.filter((t) => t.origin === origin);
      }

      if (categoryId && categoryId !== 'ALL') {
        result = result.filter((t) => t.categoryId === categoryId);
      }

      if (costCenterId && costCenterId !== 'ALL') {
        result = result.filter((t) => t.costCenterId === costCenterId);
      }

      if (clientId) {
        result = result.filter((t) => t.clientId === clientId);
      }

      if (vehicleId) {
        result = result.filter((t) => t.vehicleId === vehicleId);
      }

      if (rentalId) {
        result = result.filter((t) => t.rentalId === rentalId);
      }

      if (startDate) {
        result = result.filter((t) => t.dueDate >= String(startDate));
      }

      if (endDate) {
        result = result.filter((t) => t.dueDate <= String(endDate));
      }

      if (search) {
        const q = String(search).trim().toUpperCase();
        result = result.filter((t) => {
          const client = t.clientId ? db.clients.find((c) => c.id === t.clientId) : null;
          const vehicle = t.vehicleId ? db.vehicles.find((v) => v.id === t.vehicleId) : null;
          return (
            t.description.toUpperCase().includes(q) ||
            (client && client.name.toUpperCase().includes(q)) ||
            (vehicle && vehicle.plate.toUpperCase().includes(q)) ||
            (t.notes && t.notes.toUpperCase().includes(q))
          );
        });
      }

      // Sort by dueDate DESC
      result.sort((a, b) => b.dueDate.localeCompare(a.dueDate));

      const enriched = result.map((t) => this.enrichTransaction(t, companyId));

      res.json({
        total: enriched.length,
        data: enriched,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/financial/receivables
   * Shortcut for accounts receivable (Contas a Receber)
   */
  async getReceivables(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      db.updateFinancialStatuses();

      const { status, clientId, vehicleId, startDate, endDate, search } = req.query;

      let result = db.financialTransactions.filter(
        (t) => (t.tenantId === companyId || t.companyId === companyId) && t.type === 'INCOME'
      );

      if (status && status !== 'ALL') {
        result = result.filter((t) => t.status === status);
      }
      if (clientId) {
        result = result.filter((t) => t.clientId === clientId);
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
        result = result.filter((t) => {
          const client = t.clientId ? db.clients.find((c) => c.id === t.clientId) : null;
          const vehicle = t.vehicleId ? db.vehicles.find((v) => v.id === t.vehicleId) : null;
          return (
            t.description.toUpperCase().includes(q) ||
            (client && client.name.toUpperCase().includes(q)) ||
            (vehicle && vehicle.plate.toUpperCase().includes(q))
          );
        });
      }

      result.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

      const totalPending = result
        .filter((t) => t.status === 'PENDING' || t.status === 'PARTIAL')
        .reduce((sum, t) => sum + t.remainingAmount, 0);

      const totalOverdue = result
        .filter((t) => t.status === 'OVERDUE')
        .reduce((sum, t) => sum + t.remainingAmount, 0);

      const totalReceived = result
        .filter((t) => t.status === 'PAID')
        .reduce((sum, t) => sum + t.paidAmount, 0);

      const enriched = result.map((t) => this.enrichTransaction(t, companyId));

      res.json({
        metrics: {
          totalPending: Number(totalPending.toFixed(2)),
          totalOverdue: Number(totalOverdue.toFixed(2)),
          totalReceived: Number(totalReceived.toFixed(2)),
          count: enriched.length,
        },
        data: enriched,
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
      db.updateFinancialStatuses();

      const { status, categoryId, costCenterId, vehicleId, startDate, endDate, search } = req.query;

      let result = db.financialTransactions.filter(
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

      const tx = db.financialTransactions.find(
        (t) => t.id === id && (t.tenantId === companyId || t.companyId === companyId)
      );

      if (!tx) {
        res.status(404).json({
          error: 'TRANSACTION_NOT_FOUND',
          message: 'Lançamento financeiro não encontrado.',
        });
        return;
      }

      const enriched = this.enrichTransaction(tx, companyId);
      const settlements = db.financialSettlements
        .filter((s) => s.transactionId === tx.id)
        .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate))
        .map((s) => {
          const user = s.userId ? db.users.find((u) => u.id === s.userId) : null;
          return {
            ...s,
            userName: user ? user.name : 'SISTEMA',
          };
        });

      res.json({
        data: {
          ...enriched,
          settlements,
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
      const companyId = req.user!.companyId;
      const parsed = createFinancialTransactionSchema.parse(req.body);

      const now = new Date().toISOString();
      const gross = Number(parsed.grossAmount);
      const discount = Number(parsed.discountAmount || 0);
      const interest = Number(parsed.interestAmount || 0);
      const net = Math.max(0, Number((gross - discount + interest).toFixed(2)));

      const todayStr = now.split('T')[0];
      const isOverdue = parsed.dueDate < todayStr;

      const newTx: FinancialTransaction = {
        id: generateUUID(),
        tenantId: companyId,
        companyId,
        type: parsed.type,
        origin: parsed.origin,
        description: parsed.description.toUpperCase(),
        categoryId: parsed.categoryId || null,
        costCenterId: parsed.costCenterId || null,
        clientId: parsed.clientId || null,
        vehicleId: parsed.vehicleId || null,
        rentalId: parsed.rentalId || null,
        rentalPaymentId: null,
        recurringId: null,
        grossAmount: gross,
        discountAmount: discount,
        interestAmount: interest,
        netAmount: net,
        paidAmount: 0,
        remainingAmount: net,
        competencyDate: parsed.competencyDate || parsed.dueDate,
        dueDate: parsed.dueDate,
        settlementDate: null,
        paymentMethod: (parsed.paymentMethod as FinancialPaymentMethod) || 'PIX',
        status: isOverdue ? 'OVERDUE' : 'PENDING',
        isRecurring: !!parsed.isRecurring,
        installmentNumber: parsed.installmentNumber || null,
        totalInstallments: parsed.totalInstallments || null,
        notes: parsed.notes ? parsed.notes.toUpperCase() : null,
        createdAt: now,
        updatedAt: now,
      };

      db.financialTransactions.unshift(newTx);

      db.createAuditLog(companyId, req.user!.userId, 'CREATE', 'FINANCIAL_TRANSACTION', newTx.id, null, {
        description: newTx.description,
        type: newTx.type,
        netAmount: newTx.netAmount,
        dueDate: newTx.dueDate,
      });

      res.status(201).json({
        message: 'Lançamento financeiro registrado com sucesso!',
        data: this.enrichTransaction(newTx, companyId),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/financial/transactions/:id/settle
   * Liquidate / Pay transaction (supports partial and full settlement)
   */
  async settleTransaction(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const parsed = settleTransactionSchema.parse(req.body);

      const result = db.settleTransaction(id, companyId, {
        amount: parsed.amount,
        paymentDate: parsed.paymentDate,
        paymentMethod: parsed.paymentMethod as FinancialPaymentMethod,
        interest: parsed.interest,
        fine: parsed.fine,
        discount: parsed.discount,
        notes: parsed.notes || undefined,
        receiptUrl: parsed.receiptUrl || undefined,
        userId: req.user!.userId,
      });

      res.json({
        message: `Baixa no valor de R$ ${parsed.amount.toFixed(2)} confirmada com sucesso!`,
        data: {
          transaction: this.enrichTransaction(result.transaction, companyId),
          settlement: result.settlement,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/financial/transactions/:id/cancel
   * Cancel a transaction
   */
  async cancelTransaction(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;
      const parsed = cancelTransactionSchema.parse(req.body);

      const cancelled = db.cancelTransaction(id, companyId, req.user!.userId, parsed.reason);

      res.json({
        message: 'Lançamento cancelado com sucesso!',
        data: this.enrichTransaction(cancelled, companyId),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/financial/cashflow
   * Detailed cash flow analysis (Daily / Weekly / Monthly breakdown)
   */
  async getCashFlow(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { startDate, endDate, viewMode = 'DAILY' } = req.query;

      db.updateFinancialStatuses();

      const today = new Date();
      const start = startDate ? String(startDate) : new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const end = endDate ? String(endDate) : new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

      const transactions = db.financialTransactions.filter(
        (t) => (t.tenantId === companyId || t.companyId === companyId) && t.status !== 'CANCELLED'
      );

      // Prior balance before start date
      const priorIncomes = transactions
        .filter((t) => t.type === 'INCOME' && t.status === 'PAID' && (t.settlementDate || t.dueDate) < start)
        .reduce((sum, t) => sum + t.paidAmount, 0);

      const priorExpenses = transactions
        .filter((t) => t.type === 'EXPENSE' && t.status === 'PAID' && (t.settlementDate || t.dueDate) < start)
        .reduce((sum, t) => sum + t.paidAmount, 0);

      const openingBalance = Number((priorIncomes - priorExpenses).toFixed(2));

      // Range transactions
      const periodTx = transactions.filter((t) => {
        const dateToCheck = t.settlementDate || t.dueDate;
        return dateToCheck >= start && dateToCheck <= end;
      });

      // Group by date
      const dailyMap: Record<string, {
        date: string;
        inflowRealized: number;
        inflowProjected: number;
        outflowRealized: number;
        outflowProjected: number;
        items: any[];
      }> = {};

      // Seed all dates in the range
      const curr = new Date(`${start}T00:00:00`);
      const last = new Date(`${end}T00:00:00`);
      while (curr <= last) {
        const dStr = curr.toISOString().split('T')[0];
        dailyMap[dStr] = {
          date: dStr,
          inflowRealized: 0,
          inflowProjected: 0,
          outflowRealized: 0,
          outflowProjected: 0,
          items: [],
        };
        curr.setDate(curr.getDate() + 1);
      }

      for (const t of periodTx) {
        const dateKey = t.settlementDate || t.dueDate;
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = {
            date: dateKey,
            inflowRealized: 0,
            inflowProjected: 0,
            outflowRealized: 0,
            outflowProjected: 0,
            items: [],
          };
        }

        const enriched = this.enrichTransaction(t, companyId);
        dailyMap[dateKey].items.push(enriched);

        if (t.type === 'INCOME') {
          dailyMap[dateKey].inflowRealized += t.paidAmount;
          dailyMap[dateKey].inflowProjected += t.remainingAmount;
        } else {
          dailyMap[dateKey].outflowRealized += t.paidAmount;
          dailyMap[dateKey].outflowProjected += t.remainingAmount;
        }
      }

      let runningRealized = openingBalance;
      let runningProjected = openingBalance;

      const daysArray = Object.keys(dailyMap)
        .sort()
        .map((dKey) => {
          const day = dailyMap[dKey];
          const netRealized = Number((day.inflowRealized - day.outflowRealized).toFixed(2));
          const netProjected = Number(
            (day.inflowRealized + day.inflowProjected - (day.outflowRealized + day.outflowProjected)).toFixed(2)
          );

          runningRealized = Number((runningRealized + netRealized).toFixed(2));
          runningProjected = Number((runningProjected + netProjected).toFixed(2));

          return {
            date: day.date,
            inflowRealized: Number(day.inflowRealized.toFixed(2)),
            inflowProjected: Number(day.inflowProjected.toFixed(2)),
            outflowRealized: Number(day.outflowRealized.toFixed(2)),
            outflowProjected: Number(day.outflowProjected.toFixed(2)),
            netRealized,
            netProjected,
            balanceRealized: runningRealized,
            balanceProjected: runningProjected,
            itemsCount: day.items.length,
            items: day.items,
          };
        });

      const totalInflowRealized = daysArray.reduce((acc, d) => acc + d.inflowRealized, 0);
      const totalInflowProjected = daysArray.reduce((acc, d) => acc + d.inflowProjected, 0);
      const totalOutflowRealized = daysArray.reduce((acc, d) => acc + d.outflowRealized, 0);
      const totalOutflowProjected = daysArray.reduce((acc, d) => acc + d.outflowProjected, 0);

      res.json({
        period: { start, end },
        openingBalance,
        totalInflowRealized: Number(totalInflowRealized.toFixed(2)),
        totalInflowProjected: Number(totalInflowProjected.toFixed(2)),
        totalOutflowRealized: Number(totalOutflowRealized.toFixed(2)),
        totalOutflowProjected: Number(totalOutflowProjected.toFixed(2)),
        finalBalanceRealized: runningRealized,
        finalBalanceProjected: runningProjected,
        days: daysArray,
      });
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
      db.updateFinancialStatuses();

      const todayStr = new Date().toISOString().split('T')[0];

      const overdueTx = db.financialTransactions.filter(
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
          const client = tx.clientId ? db.clients.find((c) => c.id === tx.clientId) : null;
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

      const vehicle = db.vehicles.find((v) => v.id === id && v.companyId === companyId);
      if (!vehicle) {
        res.status(404).json({ error: 'VEHICLE_NOT_FOUND', message: 'Veículo não encontrado.' });
        return;
      }

      const transactions = db.financialTransactions
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
      const companyId = req.user!.companyId;
      const { type } = req.query;

      let result = db.financialCategories.filter(
        (c) => c.tenantId === companyId || c.companyId === companyId
      );

      if (type && type !== 'ALL') {
        result = result.filter((c) => c.type === type);
      }

      result.sort((a, b) => a.name.localeCompare(b.name));

      res.json({
        total: result.length,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async createCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const parsed = financialCategorySchema.parse(req.body);

      const now = new Date().toISOString();
      const newCat: FinancialCategory = {
        id: generateUUID(),
        tenantId: companyId,
        companyId,
        name: parsed.name.toUpperCase(),
        type: parsed.type,
        description: parsed.description ? parsed.description.toUpperCase() : null,
        color: parsed.color || '#10B981',
        active: true,
        createdAt: now,
        updatedAt: now,
      };

      db.financialCategories.push(newCat);

      res.status(201).json({
        message: 'Categoria financeira criada com sucesso!',
        data: newCat,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteCategory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const idx = db.financialCategories.findIndex(
        (c) => c.id === id && (c.tenantId === companyId || c.companyId === companyId)
      );

      if (idx === -1) {
        res.status(404).json({ error: 'CATEGORY_NOT_FOUND', message: 'Categoria não encontrada.' });
        return;
      }

      db.financialCategories.splice(idx, 1);

      res.json({ message: 'Categoria excluída com sucesso!' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Cost Centers CRUD
   */
  async listCostCenters(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const result = db.costCenters
        .filter((cc) => cc.tenantId === companyId || cc.companyId === companyId)
        .sort((a, b) => a.code.localeCompare(b.code));

      res.json({
        total: result.length,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async createCostCenter(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const parsed = costCenterSchema.parse(req.body);

      const now = new Date().toISOString();
      const newCc: CostCenter = {
        id: generateUUID(),
        tenantId: companyId,
        companyId,
        code: parsed.code.toUpperCase(),
        name: parsed.name.toUpperCase(),
        description: parsed.description ? parsed.description.toUpperCase() : null,
        active: true,
        createdAt: now,
        updatedAt: now,
      };

      db.costCenters.push(newCc);

      res.status(201).json({
        message: 'Centro de custo criado com sucesso!',
        data: newCc,
      });
    } catch (err) {
      next(err);
    }
  }

  async deleteCostCenter(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { id } = req.params;

      const idx = db.costCenters.findIndex(
        (cc) => cc.id === id && (cc.tenantId === companyId || cc.companyId === companyId)
      );

      if (idx === -1) {
        res.status(404).json({ error: 'COST_CENTER_NOT_FOUND', message: 'Centro de custo não encontrado.' });
        return;
      }

      db.costCenters.splice(idx, 1);

      res.json({ message: 'Centro de custo excluído com sucesso!' });
    } catch (err) {
      next(err);
    }
  }
}

export const financialController = new FinancialController();

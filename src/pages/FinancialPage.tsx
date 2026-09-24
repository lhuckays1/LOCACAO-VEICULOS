import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { maskCurrency, formatDate } from '../utils/formatters';
import { useToast } from '../components/ui/Toast';
import { SettlementModal } from '../components/financial/SettlementModal';
import { NewTransactionModal } from '../components/financial/NewTransactionModal';
import { TransactionDetailsModal } from '../components/financial/TransactionDetailsModal';
import { FinancialCategoriesModal } from '../components/financial/FinancialCategoriesModal';
import {
  CircleDollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  CreditCard,
  QrCode,
  Download,
  Filter,
  Search,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Send,
  Building2,
  Tag,
  Layers,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

type FinancialTab = 'DASHBOARD' | 'RECEBER' | 'PAGAR' | 'FLUXO_CAIXA' | 'INADIMPLENCIA';

const financialStatusLabel = (status?: string): string => {
  const labels: Record<string, string> = {
    PENDING: 'PENDENTE',
    PAID: 'PAGO',
    PARTIAL: 'PARCIAL',
    OVERDUE: 'VENCIDO',
    CANCELLED: 'CANCELADO',
  };

  return labels[status || ''] || status || 'NÃO INFORMADO';
};

const paymentMethodLabel = (method?: string): string => {
  const labels: Record<string, string> = {
    CASH: 'DINHEIRO',
    PIX: 'PIX',
    CREDIT_CARD: 'CARTÃO DE CRÉDITO',
    DEBIT_CARD: 'CARTÃO DE DÉBITO',
    BANK_TRANSFER: 'TRANSFERÊNCIA',
    BOLETO: 'BOLETO',
    OTHER: 'OUTRO',
  };

  return labels[method || ''] || method || 'NÃO INFORMADO';
};

const displayFinancialDescription = (description?: string): string => {
  if (!description) return 'Sem descrição';

  // Corrige registros antigos que foram gravados com encoding incorreto.
  return description
    .replace(/LocaÃ§Ã£o/g, 'Locação')
    .replace(/LOCAÃ‡ÃƒO/g, 'LOCAÇÃO')
    .replace(/Ã§Ã£o/g, 'ção')
    .replace(/Ã‡ÃƒO/g, 'ÇÃO');
};

export const FinancialPage: React.FC = () => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<FinancialTab>('DASHBOARD');

  // Modals state
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [selectedTransactionForSettlement, setSelectedTransactionForSettlement] = useState<any>(null);

  const [isNewTxOpen, setIsNewTxOpen] = useState(false);
  const [newTxDefaultType, setNewTxDefaultType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsTransactionId, setDetailsTransactionId] = useState<string | null>(null);

  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);

  // Dashboard Data
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);

  // Receivables Data
  const [receivables, setReceivables] = useState<any[]>([]);
  const [receivablesMetrics, setReceivablesMetrics] = useState<any>(null);
  const [recStatusFilter, setRecStatusFilter] = useState('ALL');
  const [recSearch, setRecSearch] = useState('');
  const [isLoadingReceivables, setIsLoadingReceivables] = useState(false);

  // Payables Data
  const [payables, setPayables] = useState<any[]>([]);
  const [payablesMetrics, setPayablesMetrics] = useState<any>(null);
  const [payStatusFilter, setPayStatusFilter] = useState('ALL');
  const [payCategoryFilter, setPayCategoryFilter] = useState('ALL');
  const [paySearch, setPaySearch] = useState('');
  const [isLoadingPayables, setIsLoadingPayables] = useState(false);

  // Cash Flow Data
  const [cashFlowData, setCashFlowData] = useState<any>(null);
  const [cfStartDate, setCfStartDate] = useState('');
  const [cfEndDate, setCfEndDate] = useState('');
  const [isLoadingCashFlow, setIsLoadingCashFlow] = useState(false);

  // Overdue Data
  const [overdueData, setOverdueData] = useState<any>(null);
  const [isLoadingOverdue, setIsLoadingOverdue] = useState(false);

  // Categories list for filters
  const [categoriesList, setCategoriesList] = useState<any[]>([]);

  // Load Dashboard
  const loadDashboard = async () => {
    setIsLoadingDashboard(true);
    try {
      const data = await api.financial.getDashboard();
      setDashboardData(data);
    } catch (err) {
      console.error(err);
      addToast({ title: 'ERRO', message: 'Falha ao carregar métricas financeiras.', type: 'danger' });
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  // Load Receivables
  const loadReceivables = async () => {
    setIsLoadingReceivables(true);
    try {
      const res = await api.financial.getReceivables({
        status: recStatusFilter,
        search: recSearch,
      });
      setReceivables(res.data || []);
      setReceivablesMetrics(res.metrics || null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingReceivables(false);
    }
  };

  // Load Payables
  const loadPayables = async () => {
    setIsLoadingPayables(true);
    try {
      const res = await api.financial.getPayables({
        status: payStatusFilter,
        categoryId: payCategoryFilter,
        search: paySearch,
      });
      setPayables(res.data || []);
      setPayablesMetrics(res.metrics || null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingPayables(false);
    }
  };

  // Load Cash Flow
  const loadCashFlow = async () => {
    setIsLoadingCashFlow(true);
    try {
      const res = await api.financial.getCashFlow({
        startDate: cfStartDate || undefined,
        endDate: cfEndDate || undefined,
      });
      setCashFlowData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingCashFlow(false);
    }
  };

  // Load Overdue
  const loadOverdue = async () => {
    setIsLoadingOverdue(true);
    try {
      const res = await api.financial.getOverdue();
      setOverdueData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingOverdue(false);
    }
  };

  // Load Categories
  const loadCategories = async () => {
    try {
      const res = await api.financial.getCategories();
      setCategoriesList(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Initial Load
  useEffect(() => {
    loadDashboard();
    loadCategories();
  }, []);

  // Handle Tab Switch
  useEffect(() => {
    if (activeTab === 'DASHBOARD') loadDashboard();
    if (activeTab === 'RECEBER') loadReceivables();
    if (activeTab === 'PAGAR') loadPayables();
    if (activeTab === 'FLUXO_CAIXA') loadCashFlow();
    if (activeTab === 'INADIMPLENCIA') loadOverdue();
  }, [activeTab]);

  // Refresh current view
  const handleRefreshCurrent = () => {
    if (activeTab === 'DASHBOARD') loadDashboard();
    if (activeTab === 'RECEBER') loadReceivables();
    if (activeTab === 'PAGAR') loadPayables();
    if (activeTab === 'FLUXO_CAIXA') loadCashFlow();
    if (activeTab === 'INADIMPLENCIA') loadOverdue();
  };

  const handleOpenSettlement = (tx: any) => {
    setSelectedTransactionForSettlement(tx);
    setIsSettlementOpen(true);
  };

  const handleOpenDetails = (txId: string) => {
    setDetailsTransactionId(txId);
    setIsDetailsOpen(true);
  };

  const handleOpenNewTransaction = (defaultType: 'INCOME' | 'EXPENSE') => {
    setNewTxDefaultType(defaultType);
    setIsNewTxOpen(true);
  };

  return (
    <div className="space-y-5 animate-in fade-in">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <CircleDollarSign className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">
                Módulo Financeiro & Controladoria
              </h1>
              <p className="text-xs text-slate-500">
                Gestão integrada de contas a pagar, receber, fluxo de caixa e conciliação de faturamento.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCategoriesModalOpen(true)}
            className="text-xs gap-1.5"
          >
            <Tag className="w-3.5 h-3.5 text-slate-500" />
            Categorias & Centros
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenNewTransaction('EXPENSE')}
            className="text-xs gap-1.5 text-rose-700 hover:text-rose-800 border-rose-200 hover:bg-rose-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Despesa
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenNewTransaction('INCOME')}
            className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Receita
          </Button>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-1 bg-white p-1 rounded-xl border">
        <button
          type="button"
          onClick={() => setActiveTab('DASHBOARD')}
          className={`py-2 px-3.5 text-xs font-bold rounded-lg flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'DASHBOARD'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          DASHBOARD & RESULTADO
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('RECEBER')}
          className={`py-2 px-3.5 text-xs font-bold rounded-lg flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'RECEBER'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ArrowDownRight className="w-3.5 h-3.5 text-emerald-400" />
          CONTAS A RECEBER
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PAGAR')}
          className={`py-2 px-3.5 text-xs font-bold rounded-lg flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'PAGAR'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5 text-rose-300" />
          CONTAS A PAGAR
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('FLUXO_CAIXA')}
          className={`py-2 px-3.5 text-xs font-bold rounded-lg flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'FLUXO_CAIXA'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          FLUXO DE CAIXA
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('INADIMPLENCIA')}
          className={`py-2 px-3.5 text-xs font-bold rounded-lg flex items-center gap-2 whitespace-nowrap transition-all ${
            activeTab === 'INADIMPLENCIA'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
          INADIMPLÊNCIA & COBRANÇA
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: DASHBOARD & RESULTADO                             */}
      {/* ======================================================== */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-5">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="RECEITAS REALIZADAS (MÊS)"
              value={maskCurrency(dashboardData?.summary?.totalRevenueRealized || 0)}
              subtitle={`Previsto a entrar: ${maskCurrency(dashboardData?.summary?.totalRevenuePending || 0)}`}
              icon={<CheckCircle2 className="w-5 h-5" />}
              variant="emerald"
            />
            <StatCard
              title="DESPESAS PAGAS (MÊS)"
              value={maskCurrency(dashboardData?.summary?.totalExpensePaid || 0)}
              subtitle={`A pagar este mês: ${maskCurrency(dashboardData?.summary?.totalExpensePending || 0)}`}
              icon={<ArrowUpRight className="w-5 h-5" />}
              variant="rose"
            />
            <StatCard
              title="SALDO LÍQUIDO EM CAIXA"
              value={maskCurrency(dashboardData?.summary?.netCashBalance || 0)}
              subtitle={`Projetado: ${maskCurrency(dashboardData?.summary?.projectedNetResult || 0)}`}
              icon={<TrendingUp className="w-5 h-5" />}
              variant="purple"
            />
            <StatCard
              title="TOTAL INADIMPLÊNCIA"
              value={maskCurrency(dashboardData?.summary?.totalOverdueAmount || 0)}
              subtitle={`Taxa de mora: ${dashboardData?.summary?.defaultRate || 0}% do faturamento`}
              icon={<AlertTriangle className="w-5 h-5" />}
              variant="amber"
            />
          </div>

          {/* Charts & Categorization Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 6 Months Evolution */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Evolução Mensal de Faturamento & Despesas</CardTitle>
                  <p className="text-xs text-slate-500">Histórico de receitas realizadas x despesas operacionais</p>
                </div>
                <Button variant="ghost" size="sm" onClick={loadDashboard} className="h-8 w-8 p-0">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 pt-2">
                  {dashboardData?.monthlyEvolution?.map((m: any) => {
                    const maxVal = Math.max(
                      ...dashboardData.monthlyEvolution.map((item: any) => Math.max(item.income, item.expense, 1000))
                    );
                    const incWidth = Math.min(100, Math.round((m.income / maxVal) * 100));
                    const expWidth = Math.min(100, Math.round((m.expense / maxVal) * 100));

                    return (
                      <div key={m.month} className="space-y-1.5 text-xs">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-800">{m.label}</span>
                          <span
                            className={`font-mono text-xs ${
                              m.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            Resultado: {maskCurrency(m.balance)}
                          </span>
                        </div>

                        {/* Income Bar */}
                        <div className="flex items-center gap-2">
                          <span className="w-16 text-[10px] text-emerald-700 font-bold uppercase">Entradas</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${incWidth}%` }}
                            />
                          </div>
                          <span className="w-20 text-right font-mono text-[11px] text-slate-700">
                            {maskCurrency(m.income)}
                          </span>
                        </div>

                        {/* Expense Bar */}
                        <div className="flex items-center gap-2">
                          <span className="w-16 text-[10px] text-rose-700 font-bold uppercase">Saídas</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-rose-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${expWidth}%` }}
                            />
                          </div>
                          <span className="w-20 text-right font-mono text-[11px] text-slate-700">
                            {maskCurrency(m.expense)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Expenses by Category */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Despesas por Categoria</CardTitle>
                <p className="text-xs text-slate-500">Distribuição dos custos da frota e operação</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 pt-2">
                  {dashboardData?.expensesByCategory?.length > 0 ? (
                    dashboardData.expensesByCategory.map((c: any) => {
                      const totalExpenses = dashboardData.expensesByCategory.reduce(
                        (sum: number, item: any) => sum + item.amount,
                        0
                      );
                      const percent = totalExpenses > 0 ? Math.round((c.amount / totalExpenses) * 100) : 0;

                      return (
                        <div key={c.name} className="space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: c.color || '#EF4444' }}
                              />
                              {c.name}
                            </span>
                            <span className="font-mono text-slate-900 font-bold">
                              {maskCurrency(c.amount)} ({percent}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${percent}%`, backgroundColor: c.color || '#EF4444' }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Nenhuma despesa registrada no período.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Maturities List (Next 15 days) */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Próximos Vencimentos (Próximos 15 dias)</CardTitle>
                <p className="text-xs text-slate-500">Faturas de clientes e despesas com vencimento iminente</p>
              </div>
              <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2.5 py-1 rounded-lg">
                {dashboardData?.upcomingTransactions?.length || 0} lançamento(s)
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Tipo / Origem</th>
                      <th className="px-4 py-3">Descrição / Vínculo</th>
                      <th className="px-4 py-3">Vencimento</th>
                      <th className="px-4 py-3">Valor Restante</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {dashboardData?.upcomingTransactions?.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-[11px] ${
                              tx.type === 'INCOME'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {tx.type === 'INCOME' ? (
                              <ArrowDownRight className="w-3 h-3" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3" />
                            )}
                            {tx.type === 'INCOME' ? 'RECEITA' : 'DESPESA'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{displayFinancialDescription(tx.description)}</div>
                          {tx.clientName && (
                            <div className="text-[11px] text-slate-500">CLIENTE: {tx.clientName}</div>
                          )}
                          {tx.vehiclePlate && (
                            <div className="text-[11px] text-slate-500">
                              VEÍCULO: <strong className="font-mono text-slate-700">{tx.vehiclePlate}</strong>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-700">
                          {formatDate(tx.dueDate)}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 font-mono">
                          {maskCurrency(tx.remainingAmount)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={tx.status}>{financialStatusLabel(tx.status)}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDetails(tx.id)}
                              className="text-xs h-7 px-2"
                            >
                              Detalhes
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleOpenSettlement(tx)}
                              className="text-xs h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700"
                            >
                              Dar Baixa
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(!dashboardData?.upcomingTransactions || dashboardData.upcomingTransactions.length === 0) && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Nenhum vencimento pendente nos próximos 15 dias.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: CONTAS A RECEBER                                  */}
      {/* ======================================================== */}
      {activeTab === 'RECEBER' && (
        <div className="space-y-4">
          {/* Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Total a Receber (Pendente)</span>
                <span className="text-xl font-black text-slate-900 font-mono">
                  {maskCurrency(receivablesMetrics?.totalPending || 0)}
                </span>
              </div>
              <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <Clock className="w-5 h-5" />
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-rose-600 font-bold uppercase block">Em Atraso (Inadimplente)</span>
                <span className="text-xl font-black text-rose-600 font-mono">
                  {maskCurrency(receivablesMetrics?.totalOverdue || 0)}
                </span>
              </div>
              <span className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-600 font-bold uppercase block">Total Já Recebido</span>
                <span className="text-xl font-black text-emerald-600 font-mono">
                  {maskCurrency(receivablesMetrics?.totalReceived || 0)}
                </span>
              </div>
              <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </span>
            </div>
          </div>

          {/* Filters Bar */}
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="BUSCAR POR CLIENTE, VEÍCULO, CONTRATO OU DESCRIÇÃO..."
                    value={recSearch}
                    onChange={(e) => setRecSearch(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && loadReceivables()}
                    className="pl-9 text-xs uppercase"
                  />
                </div>

                <div className="w-full sm:w-48">
                  <Select
                    value={recStatusFilter}
                    onChange={(e) => {
                      setRecStatusFilter(e.target.value);
                    }}
                    className="text-xs"
                  >
                    <option value="ALL">TODOS OS STATUS</option>
                    <option value="PENDING">PENDENTE</option>
                    <option value="OVERDUE">EM ATRASO</option>
                    <option value="PARTIAL">PARCIAL</option>
                    <option value="PAID">LIQUIDADO / PAGO</option>
                  </Select>
                </div>

                <Button variant="primary" size="sm" onClick={loadReceivables} className="w-full sm:w-auto text-xs gap-1.5">
                  <Filter className="w-3.5 h-3.5" />
                  Filtrar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Receivables Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Títulos a Receber & Parcelas</CardTitle>
                <p className="text-xs text-slate-500">Contratos de locação, faturas de KM excedente e avarias</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenNewTransaction('INCOME')}
                className="text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Receita Avulsa
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Vencimento</th>
                      <th className="px-4 py-3">Descrição / Contrato</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Veículo</th>
                      <th className="px-4 py-3">Valor Líquido</th>
                      <th className="px-4 py-3">Saldo Aberto</th>
                      <th className="px-4 py-3">Forma</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {receivables.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{formatDate(tx.dueDate)}</div>
                          {tx.daysOverdue > 0 && (
                            <span className="text-[10px] text-rose-600 font-bold block">
                              {tx.daysOverdue}d atrasado
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{displayFinancialDescription(tx.description)}</div>
                          {tx.contractNumber && (
                            <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded">
                              {tx.contractNumber}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">{tx.clientName || '---'}</div>
                          {tx.clientPhone && (
                            <div className="text-[11px] text-slate-500">{tx.clientPhone}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {tx.vehiclePlate ? (
                            <div>
                              <span className="font-mono font-bold text-slate-800">{tx.vehiclePlate}</span>
                              <span className="text-[10px] text-slate-500 block truncate max-w-[120px]">
                                {tx.vehicleModel}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">---</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800 font-mono">
                          {maskCurrency(tx.netAmount)}
                        </td>
                        <td className="px-4 py-3 font-black text-rose-600 font-mono">
                          {maskCurrency(tx.remainingAmount)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <span className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded font-bold">
                            {paymentMethodLabel(tx.paymentMethod)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={tx.status}>{financialStatusLabel(tx.status)}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDetails(tx.id)}
                              className="text-xs h-7 px-2"
                            >
                              Detalhes
                            </Button>
                            {tx.remainingAmount > 0 && tx.status !== 'CANCELLED' && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleOpenSettlement(tx)}
                                className="text-xs h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700"
                              >
                                Dar Baixa
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {receivables.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          {isLoadingReceivables ? 'Carregando contas a receber...' : 'Nenhum lançamento a receber encontrado.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: CONTAS A PAGAR                                    */}
      {/* ======================================================== */}
      {activeTab === 'PAGAR' && (
        <div className="space-y-4">
          {/* Summary Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Total a Pagar (Pendente)</span>
                <span className="text-xl font-black text-slate-900 font-mono">
                  {maskCurrency(payablesMetrics?.totalPending || 0)}
                </span>
              </div>
              <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <Clock className="w-5 h-5" />
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-rose-600 font-bold uppercase block">Contas Vencidas</span>
                <span className="text-xl font-black text-rose-600 font-mono">
                  {maskCurrency(payablesMetrics?.totalOverdue || 0)}
                </span>
              </div>
              <span className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-600 font-bold uppercase block">Total Já Pago</span>
                <span className="text-xl font-black text-emerald-600 font-mono">
                  {maskCurrency(payablesMetrics?.totalPaid || 0)}
                </span>
              </div>
              <span className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </span>
            </div>
          </div>

          {/* Filters Bar */}
          <Card>
            <CardContent className="p-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="relative sm:col-span-2">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="BUSCAR POR FORNECEDOR, DESCRIÇÃO OU PEÇA..."
                    value={paySearch}
                    onChange={(e) => setPaySearch(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && loadPayables()}
                    className="pl-9 text-xs uppercase"
                  />
                </div>

                <div>
                  <Select
                    value={payStatusFilter}
                    onChange={(e) => setPayStatusFilter(e.target.value)}
                    className="text-xs"
                  >
                    <option value="ALL">TODOS OS STATUS</option>
                    <option value="PENDING">PENDENTE</option>
                    <option value="OVERDUE">VENCIDA</option>
                    <option value="PARTIAL">PARCIAL</option>
                    <option value="PAID">PAGA</option>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={payCategoryFilter}
                    onChange={(e) => setPayCategoryFilter(e.target.value)}
                    className="text-xs flex-1"
                  >
                    <option value="ALL">TODAS CATEGORIAS</option>
                    {categoriesList
                      .filter((c) => c.type === 'EXPENSE')
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </Select>

                  <Button variant="primary" size="sm" onClick={loadPayables} className="text-xs">
                    <Filter className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payables Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Obrigações & Contas a Pagar</CardTitle>
                <p className="text-xs text-slate-500">Manutenções, seguro da frota, IPVA, combustíveis e despesas gerais</p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenNewTransaction('EXPENSE')}
                className="text-xs gap-1.5 bg-rose-600 hover:bg-rose-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Despesa
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Vencimento</th>
                      <th className="px-4 py-3">Descrição da Despesa</th>
                      <th className="px-4 py-3">Categoria</th>
                      <th className="px-4 py-3">Veículo</th>
                      <th className="px-4 py-3">Valor Líquido</th>
                      <th className="px-4 py-3">Saldo a Pagar</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {payables.map((tx: any) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{formatDate(tx.dueDate)}</div>
                          {tx.daysOverdue > 0 && (
                            <span className="text-[10px] text-rose-600 font-bold block">
                              {tx.daysOverdue}d em atraso
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{displayFinancialDescription(tx.description)}</div>
                          {tx.notes && <div className="text-[11px] text-slate-500 truncate max-w-xs">{tx.notes}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: `${tx.categoryColor}15`,
                              color: tx.categoryColor || '#475569',
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: tx.categoryColor || '#475569' }}
                            />
                            {tx.categoryName}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {tx.vehiclePlate ? (
                            <div>
                              <span className="font-mono font-bold text-slate-800">{tx.vehiclePlate}</span>
                              <span className="text-[10px] text-slate-500 block truncate max-w-[120px]">
                                {tx.vehicleModel}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">GERAL</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-800 font-mono">
                          {maskCurrency(tx.netAmount)}
                        </td>
                        <td className="px-4 py-3 font-black text-rose-600 font-mono">
                          {maskCurrency(tx.remainingAmount)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={tx.status}>{financialStatusLabel(tx.status)}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDetails(tx.id)}
                              className="text-xs h-7 px-2"
                            >
                              Detalhes
                            </Button>
                            {tx.remainingAmount > 0 && tx.status !== 'CANCELLED' && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleOpenSettlement(tx)}
                                className="text-xs h-7 px-2.5 bg-rose-600 hover:bg-rose-700"
                              >
                                Pagar
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {payables.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          {isLoadingPayables ? 'Carregando contas a pagar...' : 'Nenhuma conta a pagar encontrada.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: FLUXO DE CAIXA                                    */}
      {/* ======================================================== */}
      {activeTab === 'FLUXO_CAIXA' && (
        <div className="space-y-4">
          {/* Period Filter Card */}
          <Card>
            <CardContent className="p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 uppercase">Período:</span>
                <Input
                  type="date"
                  value={cfStartDate}
                  onChange={(e) => setCfStartDate(e.target.value)}
                  className="w-36 text-xs"
                />
                <span className="text-xs text-slate-400">até</span>
                <Input
                  type="date"
                  value={cfEndDate}
                  onChange={(e) => setCfEndDate(e.target.value)}
                  className="w-36 text-xs"
                />
                <Button variant="primary" size="sm" onClick={loadCashFlow} className="text-xs gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  Filtrar
                </Button>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-bold">Saldo Inicial</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {maskCurrency(cashFlowData?.openingBalance || 0)}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-emerald-600 text-[10px] block uppercase font-bold">Entradas Realizadas</span>
                  <span className="font-bold text-emerald-600 font-mono">
                    +{maskCurrency(cashFlowData?.totalInflowRealized || 0)}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-rose-600 text-[10px] block uppercase font-bold">Saídas Realizadas</span>
                  <span className="font-bold text-rose-600 font-mono">
                    -{maskCurrency(cashFlowData?.totalOutflowRealized || 0)}
                  </span>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div>
                  <span className="text-purple-700 text-[10px] block uppercase font-bold">Saldo Final em Caixa</span>
                  <span className="font-black text-purple-700 font-mono text-sm">
                    {maskCurrency(cashFlowData?.finalBalanceRealized || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cash Flow Daily Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Demonstrativo de Fluxo de Caixa Diário</CardTitle>
              <p className="text-xs text-slate-500">Conciliação diária de entradas, saídas e evolução do saldo</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3 text-emerald-700 font-bold">Entradas Realizadas</th>
                      <th className="px-4 py-3 text-emerald-600 font-bold">Entradas Previstas</th>
                      <th className="px-4 py-3 text-rose-700 font-bold">Saídas Realizadas</th>
                      <th className="px-4 py-3 text-rose-600 font-bold">Saídas Previstas</th>
                      <th className="px-4 py-3 font-bold">Saldo do Dia</th>
                      <th className="px-4 py-3 text-right font-bold">Saldo Acumulado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {cashFlowData?.days?.map((d: any) => (
                      <tr key={d.date} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-bold text-slate-900 font-mono">
                          {formatDate(d.date)}
                        </td>
                        <td className="px-4 py-3 text-emerald-700 font-mono font-bold">
                          {d.inflowRealized > 0 ? `+${maskCurrency(d.inflowRealized)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono">
                          {d.inflowProjected > 0 ? `+${maskCurrency(d.inflowProjected)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-rose-700 font-mono font-bold">
                          {d.outflowRealized > 0 ? `-${maskCurrency(d.outflowRealized)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono">
                          {d.outflowProjected > 0 ? `-${maskCurrency(d.outflowProjected)}` : '-'}
                        </td>
                        <td className="px-4 py-3 font-bold font-mono">
                          <span
                            className={
                              d.netRealized >= 0 ? 'text-emerald-700' : 'text-rose-700'
                            }
                          >
                            {maskCurrency(d.netRealized)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-black font-mono text-slate-900">
                          {maskCurrency(d.balanceRealized)}
                        </td>
                      </tr>
                    ))}
                    {(!cashFlowData?.days || cashFlowData.days.length === 0) && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          {isLoadingCashFlow ? 'Calculando fluxo de caixa...' : 'Nenhum registro para o período.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: INADIMPLÊNCIA & COBRANÇA                          */}
      {/* ======================================================== */}
      {activeTab === 'INADIMPLENCIA' && (
        <div className="space-y-4">
          {/* Overdue Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-rose-700 font-black uppercase tracking-wider block">
                  VALOR TOTAL EM ATRASO (RECUPERAÇÃO)
                </span>
                <span className="text-2xl font-black text-rose-700 font-mono mt-0.5 block">
                  {maskCurrency(overdueData?.totalOverdueSum || 0)}
                </span>
                <span className="text-xs text-rose-600">
                  Total de cobranças vencidas aguardando regularização.
                </span>
              </div>
              <span className="p-3 rounded-xl bg-rose-200 text-rose-800">
                <AlertTriangle className="w-6 h-6" />
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">
                  CLIENTES DEVEDORES ATIVOS
                </span>
                <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">
                  {overdueData?.totalDebtors || 0}
                </span>
                <span className="text-xs text-slate-500">
                  Clientes com faturas em atraso há mais de 1 dia.
                </span>
              </div>
              <span className="p-3 rounded-xl bg-slate-100 text-slate-700">
                <Building2 className="w-6 h-6" />
              </span>
            </div>
          </div>

          {/* Debtors List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Painel de Cobrança & Recuperação de Crédito</CardTitle>
              <p className="text-xs text-slate-500">
                Ações rápidas de contato via WhatsApp com mensagens personalizadas contendo o saldo devido.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {overdueData?.debtors?.map((d: any) => (
                  <div key={d.client.id} className="p-4 hover:bg-slate-50/70 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{d.client.name}</h3>
                          <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-200">
                            {d.titlesCount} título(s) vencido(s)
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>CPF/CNPJ: <strong className="text-slate-700">{d.client.cpfCnpj}</strong></span>
                          <span>Telefone: <strong className="text-slate-700">{d.client.phone}</strong></span>
                          <span className="text-rose-600 font-bold">
                            Vencimento mais antigo: {formatDate(d.oldestDueDate)} ({d.maxDaysOverdue} dias de atraso)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Devido</span>
                          <span className="text-base font-black text-rose-600 font-mono">
                            {maskCurrency(d.totalOverdue)}
                          </span>
                        </div>

                        {d.whatsAppLink ? (
                          <a
                            href={d.whatsAppLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Cobrar WhatsApp
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sem Telefone</span>
                        )}
                      </div>
                    </div>

                    {/* Expandable Titles */}
                    <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {d.transactions.map((tx: any) => (
                        <div
                          key={tx.id}
                          className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-900 block truncate max-w-[180px]">
                              {displayFinancialDescription(tx.description)}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              Venc: {formatDate(tx.dueDate)} • {tx.daysOverdue}d atraso
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold font-mono text-rose-600">
                              {maskCurrency(tx.remainingAmount)}
                            </span>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleOpenSettlement(tx)}
                              className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700"
                            >
                              Receber
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {(!overdueData?.debtors || overdueData.debtors.length === 0) && (
                  <div className="py-12 text-center text-xs text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">Parabéns! Nenhuma fatura vencida em aberto.</p>
                    <p className="text-slate-400 mt-0.5">Todos os pagamentos estão rigorosamente em dia.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODALS                                                   */}
      {/* ======================================================== */}
      <SettlementModal
        isOpen={isSettlementOpen}
        onClose={() => {
          setIsSettlementOpen(false);
          setSelectedTransactionForSettlement(null);
        }}
        transaction={selectedTransactionForSettlement}
        onSuccess={() => {
          handleRefreshCurrent();
          loadDashboard();
        }}
      />

      <NewTransactionModal
        isOpen={isNewTxOpen}
        onClose={() => setIsNewTxOpen(false)}
        defaultType={newTxDefaultType}
        onSuccess={() => {
          handleRefreshCurrent();
          loadDashboard();
        }}
      />

      <TransactionDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setDetailsTransactionId(null);
        }}
        transactionId={detailsTransactionId}
        onOpenSettlement={(tx) => handleOpenSettlement(tx)}
        onRefresh={() => {
          handleRefreshCurrent();
          loadDashboard();
        }}
      />

      <FinancialCategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        onUpdated={() => {
          loadCategories();
          loadDashboard();
        }}
      />
    </div>
  );
};

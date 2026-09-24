import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DashboardMetrics, UpcomingDuePayment } from '../types';
import { StatCard } from '../components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { maskCurrency, formatDate, maskPhone, maskPlate } from '../utils/formatters';
import {
  Car,
  CheckCircle2,
  KeyRound,
  Wrench,
  Users,
  CircleDollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Clock,
  CalendarCheck,
  AlertCircle,
} from 'lucide-react';
import { NavigationTab } from '../layouts/AppLayout';

interface DashboardPageProps {
  onNavigate: (tab: NavigationTab) => void;
}

const translateStatus = (status: string): string => {
  const translations: Record<string, string> = {
    DRAFT: 'RASCUNHO',
    SCHEDULED: 'AGENDADO',
    ACTIVE: 'ATIVO',
    COMPLETED: 'CONCLUÍDO',
    CANCELLED: 'CANCELADO',
    OVERDUE: 'ATRASADO',
    BLOCKED: 'BLOQUEADO',
    IN_PROGRESS: 'EM ANDAMENTO',
    WAITING_PARTS: 'AGUARDANDO PEÇAS',
    PENDING: 'PENDENTE',
    PAID: 'PAGO',
    PARTIAL: 'PARCIAL',
  };

  return translations[status] || status;
};

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentRentals, setRecentRentals] = useState<any[]>([]);
  const [upcomingDuePayments, setUpcomingDuePayments] = useState<UpcomingDuePayment[]>([]);
  const [urgentMaintenances, setUrgentMaintenances] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const data = await api.dashboard.getMetrics();
      setMetrics(data.metrics);
      setRecentRentals(data.recentRentals || []);
      setUpcomingDuePayments(data.upcomingDuePayments || []);
      setUrgentMaintenances(data.urgentMaintenances || []);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-72 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  const m = metrics || {
    totalVehicles: 0,
    availableVehicles: 0,
    rentedVehicles: 0,
    maintenanceVehicles: 0,
    blockedVehicles: 0,
    totalClients: 0,
    activeClients: 0,
    activeRentals: 0,
    overdueRentals: 0,
    totalRentals: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    overdueRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    utilizationRate: 0,
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Banner / Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white shadow-md border border-slate-800">
        <div>
          <h1 className="text-xl font-black tracking-tight">Visão Geral da Frota & Operações</h1>
          <p className="text-xs text-slate-300 mt-1">
            Status em tempo real das locações, veículos disponíveis, vencimentos e faturamento.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="TOTAL DE VEÍCULOS"
          value={m.totalVehicles}
          subtitle={`${m.utilizationRate}% taxa de ocupação da frota`}
          icon={<Car className="w-5 h-5" />}
          variant="default"
          onClick={() => onNavigate('VEICULOS')}
        />

        <StatCard
          title="VEÍCULOS DISPONÍVEIS"
          value={m.availableVehicles}
          subtitle="Prontos para nova locação"
          icon={<CheckCircle2 className="w-5 h-5" />}
          variant="emerald"
          onClick={() => onNavigate('VEICULOS')}
        />

        <StatCard
          title="LOCAÇÕES ATIVAS"
          value={m.activeRentals}
          subtitle={`${m.rentedVehicles} veículos em circulação`}
          icon={<KeyRound className="w-5 h-5" />}
          variant="blue"
          onClick={() => onNavigate('LOCACOES')}
        />

        <StatCard
          title="LOCAÇÕES ATRASADAS"
          value={m.overdueRentals || 0}
          subtitle={
            (m.overdueRentals || 0) > 0
              ? 'Cobranças pendentes com atraso'
              : 'Nenhuma inadimplência ativa'
          }
          icon={<AlertCircle className="w-5 h-5" />}
          variant={(m.overdueRentals || 0) > 0 ? 'rose' : 'emerald'}
          onClick={() => onNavigate('LOCACOES')}
        />

        <StatCard
          title="TOTAL DE CLIENTES"
          value={m.totalClients}
          subtitle={`${m.activeClients} clientes/motoristas ativos`}
          icon={<Users className="w-5 h-5" />}
          variant="purple"
          onClick={() => onNavigate('CLIENTES')}
        />

        <StatCard
          title="EM MANUTENÇÃO"
          value={m.maintenanceVehicles}
          subtitle={m.maintenanceVehicles > 0 ? 'Revisões ou reparos' : 'Nenhum veículo parado'}
          icon={<Wrench className="w-5 h-5" />}
          variant="amber"
          onClick={() => onNavigate('MANUTENCAO')}
        />

        <StatCard
          title="RECEITA RECEBIDA"
          value={maskCurrency(m.totalRevenue)}
          subtitle={`A receber: ${maskCurrency(m.pendingRevenue)}`}
          icon={<CircleDollarSign className="w-5 h-5" />}
          variant="emerald"
          onClick={() => onNavigate('FINANCEIRO')}
        />

        <StatCard
          title="DESPESAS & CUSTOS"
          value={maskCurrency(m.totalExpenses)}
          subtitle={`Lucro líquido: ${maskCurrency(m.netProfit)}`}
          icon={<TrendingUp className="w-5 h-5" />}
          variant="rose"
          onClick={() => onNavigate('FINANCEIRO')}
        />
      </div>

      {/* Fleet Utilization Progress & Quick Status Bar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Status e Ocupação da Frota</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">Distribuição operacional dos veículos cadastrados</p>
          </div>
          <Badge variant="info" className="text-xs font-mono font-bold">
            {m.utilizationRate}% Em Uso
          </Badge>
        </CardHeader>
        <CardContent>
          {/* Progress bar */}
          <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            {m.totalVehicles > 0 ? (
              <>
                <div
                  style={{ width: `${(m.rentedVehicles / m.totalVehicles) * 100}%` }}
                  className="bg-blue-600 transition-all duration-500"
                  title={`Alugados: ${m.rentedVehicles}`}
                />
                <div
                  style={{ width: `${(m.availableVehicles / m.totalVehicles) * 100}%` }}
                  className="bg-emerald-500 transition-all duration-500"
                  title={`Disponíveis: ${m.availableVehicles}`}
                />
                <div
                  style={{ width: `${(m.maintenanceVehicles / m.totalVehicles) * 100}%` }}
                  className="bg-amber-500 transition-all duration-500"
                  title={`Manutenção: ${m.maintenanceVehicles}`}
                />
                <div
                  style={{ width: `${(m.blockedVehicles / m.totalVehicles) * 100}%` }}
                  className="bg-rose-500 transition-all duration-500"
                  title={`Bloqueados: ${m.blockedVehicles}`}
                />
              </>
            ) : (
              <div className="w-full bg-slate-200" />
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/60 border border-blue-100">
              <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Alugados</span>
                <span className="font-bold text-slate-800 text-sm">{m.rentedVehicles}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Disponíveis</span>
                <span className="font-bold text-slate-800 text-sm">{m.availableVehicles}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50/60 border border-amber-100">
              <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Manutenção</span>
                <span className="font-bold text-slate-800 text-sm">{m.maintenanceVehicles}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-rose-50/60 border border-rose-100">
              <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Bloqueados</span>
                <span className="font-bold text-slate-800 text-sm">{m.blockedVehicles}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Próximos Vencimentos de Cobrança (Installments) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-emerald-600" />
              Próximos Vencimentos de Locação
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Parcelas de contratos pendentes de recebimento ordenadas por data
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs font-bold text-emerald-700"
            onClick={() => onNavigate('LOCACOES')}
          >
            Acessar Locações
            <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {upcomingDuePayments.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Nenhuma parcela com vencimento próximo ou em atraso.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Contrato</th>
                    <th className="px-4 py-3">Cliente / Motorista</th>
                    <th className="px-4 py-3">Veículo</th>
                    <th className="px-4 py-3">Parcela / Descrição</th>
                    <th className="px-4 py-3">Vencimento</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {upcomingDuePayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-emerald-800 text-[11px]">
                        {p.codigoContrato}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{p.clienteNome}</div>
                        {p.clienteTelefone && (
                          <div className="text-[10px] text-slate-400">{maskPhone(p.clienteTelefone)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded text-[10px] mr-1.5">
                          {p.veiculoPlaca}
                        </span>
                        <span className="text-slate-600 text-[11px]">{p.veiculoModelo}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="font-semibold text-slate-800">Parcela #{p.numeroParcela}</span>
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">{p.descricao}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {formatDate(p.dataVencimento)}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {maskCurrency(p.valor)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant={p.status}>{p.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two Column Layout: Recent Rentals & Urgent Maintenances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Rentals (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Últimas Locações Registradas</CardTitle>
              <p className="text-xs text-slate-500">Contratos de locação ativos ou recentes</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-bold text-emerald-700"
              onClick={() => onNavigate('LOCACOES')}
            >
              Ver Todas
              <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentRentals.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Nenhuma locação registrada até o momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-5 py-3">Contrato / Cliente</th>
                      <th className="px-4 py-3">Veículo</th>
                      <th className="px-4 py-3">Período</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {recentRentals.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3">
                          <div className="font-mono font-bold text-emerald-800 text-[11px]">
                            {r.codigoContrato || r.rentalNumber}
                          </div>
                          <div className="text-slate-700 font-medium text-[11px] truncate max-w-[180px]">
                            {r.clientName}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-[11px] border border-slate-200">
                            {r.vehiclePlate}
                          </span>
                          <div className="text-[11px] text-slate-500 truncate max-w-[140px] mt-0.5">
                            {r.vehicleModel}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <div>{formatDate(r.startDate)}</div>
                          <div className="text-[10px] text-slate-400">até {formatDate(r.endDate)}</div>
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {maskCurrency(r.amount)}
                          <span className="text-[10px] text-slate-400 block font-normal uppercase">
                            /{r.billingFrequency}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Badge variant={r.status as any}>{translateStatus(r.status)}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Urgent Maintenances & Alerts (1 col) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle>Ordens de Manutenção</CardTitle>
              <p className="text-xs text-slate-500">Oficinas e manutenções programadas</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs font-bold text-amber-700"
              onClick={() => onNavigate('MANUTENCAO')}
            >
              Ver Todas
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {urgentMaintenances.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs flex flex-col items-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                <span>Nenhuma manutenção urgente pendente. Frota 100% revisada.</span>
              </div>
            ) : (
              urgentMaintenances.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl border border-amber-200/70 bg-amber-50/40 flex flex-col gap-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-200 text-[11px]">
                      {m.vehiclePlate}
                    </span>
                    <Badge variant={m.status as any}>{translateStatus(m.status)}</Badge>
                  </div>
                  <div className="font-bold text-slate-900 line-clamp-1">{m.description}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-amber-100">
                    <span>{m.workshop}</span>
                    <span className="font-bold text-slate-800">{maskCurrency(m.cost)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

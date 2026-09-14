import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Rental, Client, Vehicle } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { Skeleton } from '../components/ui/Skeleton';
import { RentalDetailModal } from '../components/rentals/RentalDetailModal';
import { RentalWizardModal } from '../components/rentals/RentalWizardModal';
import { RentalReturnModal } from '../components/rentals/RentalReturnModal';
import { RentalCancelModal } from '../components/rentals/RentalCancelModal';
import {
  maskPlate,
  maskCurrency,
  maskMileage,
  maskCPFOrCNPJ,
  formatDate,
} from '../utils/formatters';
import {
  KeyRound,
  Search,
  Plus,
  Filter,
  Car,
  User,
  Calendar,
  DollarSign,
  FileCheck,
  ShieldCheck,
  AlertCircle,
  Eye,
  XCircle,
  RefreshCw,
  Clock,
} from 'lucide-react';

interface RentalsPageProps {
  isOpenCreateModal?: boolean;
  onCloseCreateModal?: () => void;
}

export const RentalsPage: React.FC<RentalsPageProps> = ({
  isOpenCreateModal = false,
  onCloseCreateModal,
}) => {
  const { success: toastSuccess, error: toastError } = useToast();

  const [rentals, setRentals] = useState<Rental[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Modals state
  const [isWizardOpen, setIsWizardOpen] = useState(isOpenCreateModal);
  const [selectedDetailRental, setSelectedDetailRental] = useState<Rental | null>(null);
  const [selectedReturnRental, setSelectedReturnRental] = useState<Rental | null>(null);
  const [selectedCancelRental, setSelectedCancelRental] = useState<Rental | null>(null);

  useEffect(() => {
    if (isOpenCreateModal) {
      setIsWizardOpen(true);
    }
  }, [isOpenCreateModal]);

  const fetchRentals = async () => {
    try {
      setIsLoading(true);
      const res = await api.rentals.list({
        search: searchQuery,
        status: statusFilter,
        clientId: clientFilter,
        vehicleId: vehicleFilter,
        startDate: startDateFilter,
        endDate: endDateFilter,
      });
      setRentals(res.data);
    } catch (err: any) {
      toastError('Erro ao carregar locações', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAuxiliaryData = async () => {
    try {
      const [clientsRes, allVehiclesRes, availableVehiclesRes] = await Promise.all([
        api.clients.list({ active: true }),
        api.vehicles.list(),
        api.vehicles.list({ status: 'AVAILABLE' }),
      ]);
      setClients(clientsRes.data);
      setVehicles(allVehiclesRes.data);
      setAvailableVehicles(availableVehiclesRes.data);
    } catch (err: any) {
      console.error('Error fetching auxiliary data:', err);
    }
  };

  useEffect(() => {
    fetchRentals();
    loadAuxiliaryData();
  }, [statusFilter, clientFilter, vehicleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRentals();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setClientFilter('ALL');
    setVehicleFilter('ALL');
    setStartDateFilter('');
    setEndDateFilter('');
  };

  const handleOpenDetails = async (rentalId: string) => {
    try {
      const res = await api.rentals.getById(rentalId);
      setSelectedDetailRental(res.data);
    } catch (err: any) {
      toastError('Erro ao carregar detalhes', err.message);
    }
  };

  const handleCloseWizard = () => {
    setIsWizardOpen(false);
    if (onCloseCreateModal) onCloseCreateModal();
  };

  // Metrics summary calculated from current list
  const activeCount = rentals.filter((r) => r.status === 'ATIVA' || r.status === 'ACTIVE').length;
  const overdueCount = rentals.filter((r) => r.status === 'ATRASADA' || r.status === 'OVERDUE').length;
  const totalAmount = rentals.reduce(
    (sum, r) => sum + (r.valorTotalPrevisto || (r.valorPeriodo || r.amount || 0) * (r.quantidadePeriodos || 1)),
    0
  );
  const totalPaid = rentals.reduce(
    (sum, r) => sum + (r.financialSummary?.totalPaid || 0),
    0
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-emerald-600" />
            Gestão de Locações & Contratos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Módulo central para controle de contratos, vistorias de entrega/retorno, faturamento recorrente e caução.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              fetchRentals();
              loadAuxiliaryData();
            }}
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            title="Recarregar dados"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </Button>

          <Button
            onClick={() => setIsWizardOpen(true)}
            variant="primary"
            size="md"
            className="gap-2 font-bold shadow-xs bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            Nova Locação (Assistente)
          </Button>
        </div>
      </div>

      {/* Top KPI Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] uppercase font-bold tracking-wider">Total de Locações</span>
            <KeyRound className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{rentals.length}</div>
          <span className="text-[10px] text-slate-400 mt-1 block">Registradas no sistema</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs bg-gradient-to-br from-white to-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[10px] uppercase font-bold tracking-wider">Locações Ativas</span>
            <Car className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">{activeCount}</div>
          <span className="text-[10px] text-emerald-600 mt-1 block">Veículos em circulação</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-xs bg-gradient-to-br from-white to-rose-50/20">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[10px] uppercase font-bold tracking-wider">Locações Atrasadas</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700">{overdueCount}</div>
          <span className="text-[10px] text-rose-600 mt-1 block">Atenção requerida</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] uppercase font-bold tracking-wider">Faturamento Recebido</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-xl font-black text-emerald-700 font-mono">
            {maskCurrency(totalPaid)}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            de {maskCurrency(totalAmount)} previstos
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <form onSubmit={handleSearchSubmit} className="space-y-3">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por Contrato (LOC-2026...), Cliente, CPF/CNPJ ou Placa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Status: Todos</option>
                  <option value="ATIVA">Ativas (Em Andamento)</option>
                  <option value="FINALIZADA">Finalizadas / Devolvidas</option>
                  <option value="ATRASADA">Atrasadas</option>
                  <option value="AGENDADA">Agendadas</option>
                  <option value="RASCUNHO">Rascunho</option>
                  <option value="CANCELADA">Canceladas</option>
                </select>

                <Button type="submit" variant="primary" size="sm" className="text-xs font-bold shrink-0">
                  Buscar
                </Button>
              </div>
            </div>

            {/* Advanced Filters: Cliente, Veículo e Período */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-700"
              >
                <option value="ALL">Filtrar por Cliente (Todos)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={vehicleFilter}
                onChange={(e) => setVehicleFilter(e.target.value)}
                className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-700"
              >
                <option value="ALL">Filtrar por Veículo (Todos)</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} - {v.brand} {v.model}
                  </option>
                ))}
              </select>

              <input
                type="date"
                placeholder="Início a partir de"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-700"
              />

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  placeholder="Até data fim"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="text-xs rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white text-slate-700 w-full"
                />
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-[11px] text-slate-500 hover:text-slate-900 underline shrink-0"
                >
                  Limpar
                </button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Rentals Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : rentals.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <KeyRound className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700 text-sm">Nenhuma locação encontrada</p>
              <p className="text-slate-400 mt-1 max-w-sm mx-auto">
                Não há contratos de locação correspondentes aos filtros selecionados. Clique em "Nova Locação" para abrir um novo contrato.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4 font-bold"
                onClick={() => setIsWizardOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Criar Primeira Locação
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Contrato / Cliente</th>
                    <th className="px-4 py-3.5">Veículo</th>
                    <th className="px-4 py-3.5">Vigência</th>
                    <th className="px-4 py-3.5">Cobrança & Valores</th>
                    <th className="px-4 py-3.5">Caução</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {rentals.map((r) => {
                    const contractNumber = r.codigoContrato || r.rentalNumber;
                    const isRentalActive = r.status === 'ATIVA' || r.status === 'ACTIVE';
                    const isRentalCancelable =
                      r.status === 'RASCUNHO' ||
                      r.status === 'AGENDADA' ||
                      r.status === 'DRAFT' ||
                      r.status === 'SCHEDULED';

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Contrato / Cliente */}
                        <td className="px-4 py-3.5">
                          <div className="font-black text-slate-900 font-mono text-[11px] text-emerald-800">
                            {contractNumber}
                          </div>
                          <div className="font-bold text-slate-900 text-xs mt-0.5">
                            {r.client ? r.client.name : 'CLIENTE NÃO ENCONTRADO'}
                          </div>
                          {r.client && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              {maskCPFOrCNPJ(r.client.cpfCnpj)}
                            </div>
                          )}
                        </td>

                        {/* Veículo */}
                        <td className="px-4 py-3.5">
                          {r.vehicle ? (
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold bg-slate-900 text-white px-2 py-0.5 rounded text-[11px] shrink-0">
                                {maskPlate(r.vehicle.plate)}
                              </span>
                              <div>
                                <div className="font-bold text-slate-900">
                                  {r.vehicle.brand} {r.vehicle.model}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  Odômetro: {maskMileage(r.kmInicial ?? r.initialMileage)}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Veículo indisponível</span>
                          )}
                        </td>

                        {/* Vigência */}
                        <td className="px-4 py-3.5 text-slate-600">
                          <div>
                            Início: <strong>{formatDate(r.dataInicio || r.startDate)}</strong>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Previsão: {formatDate(r.dataFimPrevista || r.endDate)}
                          </div>
                          {r.dataFimReal && (
                            <div className="text-[10px] text-emerald-700 font-bold">
                              Devolvido: {formatDate(r.dataFimReal)}
                            </div>
                          )}
                        </td>

                        {/* Cobrança & Valores */}
                        <td className="px-4 py-3.5 text-slate-800">
                          <div className="font-black text-slate-900">
                            {maskCurrency(r.valorPeriodo ?? r.amount)}
                          </div>
                          <div className="text-[10px] text-slate-500 uppercase font-semibold">
                            {r.tipoCobranca || r.billingFrequency} (Venc. Dia {r.diaVencimento || r.dueDay || 5})
                          </div>
                          <div className="text-[10px] text-emerald-700 font-bold">
                            Total: {maskCurrency(r.valorTotalPrevisto ?? (r.valorPeriodo ?? r.amount) * (r.quantidadePeriodos || 1))}
                          </div>
                        </td>

                        {/* Caução */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-900 text-[11px]">
                            {maskCurrency(r.valorCaucao ?? r.depositAmount)}
                          </div>
                          <div className="mt-0.5">
                            <Badge variant={r.statusCaucao || 'PENDENTE'}>
                              {r.statusCaucao || 'PENDENTE'}
                            </Badge>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5">
                          <Badge variant={r.status}>{r.status}</Badge>
                        </td>

                        {/* Ações */}
                        <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-[11px] py-1 px-2.5 h-auto font-semibold gap-1"
                            onClick={() => handleOpenDetails(r.id)}
                            title="Ver detalhes do contrato"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            Detalhes
                          </Button>

                          {isRentalActive && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="text-[11px] py-1 px-2.5 h-auto font-bold bg-slate-900 hover:bg-slate-800 text-white gap-1"
                              onClick={() => setSelectedReturnRental(r)}
                              title="Registrar devolução do veículo"
                            >
                              <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                              Devolução
                            </Button>
                          )}

                          {isRentalCancelable && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[11px] py-1 px-2 h-auto text-rose-600 hover:bg-rose-50 border-rose-200"
                              onClick={() => setSelectedCancelRental(r)}
                              title="Cancelar locação"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4-Step Wizard Modal for Creating Rental */}
      <RentalWizardModal
        isOpen={isWizardOpen}
        onClose={handleCloseWizard}
        onSuccess={() => {
          fetchRentals();
          loadAuxiliaryData();
        }}
        clients={clients}
        availableVehicles={availableVehicles}
      />

      {/* 4-Tab Detail Modal */}
      {selectedDetailRental && (
        <RentalDetailModal
          rental={selectedDetailRental}
          isOpen={!!selectedDetailRental}
          onClose={() => setSelectedDetailRental(null)}
          onRefresh={async () => {
            if (selectedDetailRental) {
              const res = await api.rentals.getById(selectedDetailRental.id);
              setSelectedDetailRental(res.data);
              fetchRentals();
            }
          }}
          onOpenReturnModal={(rental) => setSelectedReturnRental(rental)}
          onOpenCancelModal={(rental) => setSelectedCancelRental(rental)}
        />
      )}

      {/* Return Vehicle Modal */}
      {selectedReturnRental && (
        <RentalReturnModal
          rental={selectedReturnRental}
          isOpen={!!selectedReturnRental}
          onClose={() => setSelectedReturnRental(null)}
          onSuccess={() => {
            fetchRentals();
            loadAuxiliaryData();
            if (selectedDetailRental) setSelectedDetailRental(null);
          }}
        />
      )}

      {/* Cancel Rental Modal */}
      {selectedCancelRental && (
        <RentalCancelModal
          rental={selectedCancelRental}
          isOpen={!!selectedCancelRental}
          onClose={() => setSelectedCancelRental(null)}
          onSuccess={() => {
            fetchRentals();
            loadAuxiliaryData();
            if (selectedDetailRental) setSelectedDetailRental(null);
          }}
        />
      )}
    </div>
  );
};

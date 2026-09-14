import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Vehicle, VehicleStatus } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { Skeleton } from '../components/ui/Skeleton';
import {
  maskPlate,
  maskCurrency,
  maskMileage,
  formatDate,
  formatDateTime,
  validatePlate,
  maskRenavam,
} from '../utils/formatters';
import {
  Car,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Fuel,
  Calendar,
  Gauge,
  Shield,
  Radio,
  LayoutGrid,
  List,
  Wrench,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
} from 'lucide-react';

interface VehiclesPageProps {
  isOpenCreateModal?: boolean;
  onCloseCreateModal?: () => void;
  onNavigateToRentals?: () => void;
}

export const VehiclesPage: React.FC<VehiclesPageProps> = ({
  isOpenCreateModal = false,
  onCloseCreateModal,
  onNavigateToRentals,
}) => {
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(isOpenCreateModal);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Detail Modal State
  const [viewingVehicle, setViewingVehicle] = useState<any | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Form State - 100% Manual Registration & Full Technical Specs
  const [formData, setFormData] = useState({
    // DADOS PRINCIPAIS
    plate: '',
    brand: '',
    model: '',
    version: '',
    manufactureYear: new Date().getFullYear(),
    modelYear: new Date().getFullYear(),
    color: 'BRANCO',
    fuel: 'FLEX',
    category: 'HATCH COMPACTO',
    vehicleType: 'CARRO DE PASSEIO',
    status: 'AVAILABLE' as VehicleStatus,

    // DADOS TÉCNICOS
    renavam: '',
    chassis: '',
    engine: '',
    currentMileage: 0,
    power: '116 CV',
    displacement: '1.0',
    passengerCapacity: 5,

    // DADOS FINANCEIROS
    purchaseValue: 75000,
    purchaseDate: new Date().toISOString().split('T')[0],
    dailyRate: 110,
    weeklyRate: 590,
    biweeklyRate: 1150,
    monthlyRate: 2190,
    mileageAllowance: 1000,
    excessMileageRate: 0.45,

    // OUTROS
    insuranceProvider: 'PORTO SEGURO AUTO',
    insuranceExpiration: '',
    tracker: 'RASTREADOR GPS COM CORTE REMOTO 4G',
    notes: '',
  });

  useEffect(() => {
    if (isOpenCreateModal) {
      handleOpenCreate();
    }
  }, [isOpenCreateModal]);

  const fetchVehicles = async () => {
    try {
      setIsLoading(true);
      const res = await api.vehicles.list({
        search: searchQuery,
        status: statusFilter,
        category: categoryFilter,
      });
      setVehicles(res.data);
    } catch (err: any) {
      toastError('Erro ao carregar frota', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [statusFilter, categoryFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchVehicles();
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedVehicleId(null);
    setFormData({
      plate: '',
      brand: '',
      model: '',
      version: '',
      manufactureYear: new Date().getFullYear(),
      modelYear: new Date().getFullYear(),
      color: 'BRANCO',
      fuel: 'FLEX',
      category: 'HATCH COMPACTO',
      vehicleType: 'CARRO DE PASSEIO',
      status: 'AVAILABLE',
      renavam: '',
      chassis: '',
      engine: '',
      currentMileage: 10000,
      power: '116 CV',
      displacement: '1.0',
      passengerCapacity: 5,
      purchaseValue: 75000,
      purchaseDate: new Date().toISOString().split('T')[0],
      dailyRate: 110,
      weeklyRate: 590,
      biweeklyRate: 1150,
      monthlyRate: 2190,
      mileageAllowance: 1000,
      excessMileageRate: 0.45,
      insuranceProvider: 'PORTO SEGURO AUTO',
      insuranceExpiration: '',
      tracker: 'RASTREADOR GPS COM CORTE REMOTO 4G',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (vehicle: any) => {
    setIsEditing(true);
    setSelectedVehicleId(vehicle.id);
    setFormData({
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      version: vehicle.version || '',
      manufactureYear: vehicle.manufactureYear,
      modelYear: vehicle.modelYear,
      color: vehicle.color,
      fuel: vehicle.fuel,
      category: vehicle.category,
      vehicleType: vehicle.vehicleType || 'CARRO DE PASSEIO',
      status: vehicle.status,
      renavam: vehicle.renavam || '',
      chassis: vehicle.chassis || '',
      engine: vehicle.engine || '',
      currentMileage: vehicle.currentMileage,
      power: vehicle.power || '',
      displacement: vehicle.displacement || '',
      passengerCapacity: vehicle.passengerCapacity || 5,
      purchaseValue: vehicle.purchaseValue || 0,
      purchaseDate: vehicle.purchaseDate ? vehicle.purchaseDate.split('T')[0] : '',
      dailyRate: vehicle.dailyRate,
      weeklyRate: vehicle.weeklyRate,
      biweeklyRate: vehicle.biweeklyRate || 0,
      monthlyRate: vehicle.monthlyRate,
      mileageAllowance: vehicle.mileageAllowance,
      excessMileageRate: vehicle.excessMileageRate,
      insuranceProvider: vehicle.insuranceProvider || '',
      insuranceExpiration: vehicle.insuranceExpiration ? vehicle.insuranceExpiration.split('T')[0] : '',
      tracker: vehicle.tracker || '',
      notes: vehicle.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    if (onCloseCreateModal) onCloseCreateModal();
  };

  const handleOpenDetails = async (vehicle: Vehicle) => {
    try {
      setIsLoadingDetails(true);
      const res = await api.vehicles.getById(vehicle.id);
      setViewingVehicle(res.data);
    } catch (err: any) {
      toastError('Erro ao buscar detalhes', err.message);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.plate || !formData.brand || !formData.model) {
      toastError('Campos obrigatórios', 'Placa, Marca e Modelo são de preenchimento obrigatório.');
      return;
    }

    const cleanPlate = formData.plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!validatePlate(cleanPlate)) {
      toastError(
        'Placa inválida',
        'Informe uma placa válida no formato Mercosul (ABC1D23) ou Tradicional (ABC-1234).'
      );
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        plate: cleanPlate,
        brand: formData.brand.trim().toUpperCase(),
        model: formData.model.trim().toUpperCase(),
        version: formData.version ? formData.version.trim().toUpperCase() : null,
        color: formData.color.trim().toUpperCase(),
        fuel: formData.fuel.trim().toUpperCase(),
        category: formData.category.trim().toUpperCase(),
        vehicleType: formData.vehicleType ? formData.vehicleType.trim().toUpperCase() : 'CARRO DE PASSEIO',
        chassis: formData.chassis ? formData.chassis.trim().toUpperCase() : null,
        engine: formData.engine ? formData.engine.trim().toUpperCase() : null,
        power: formData.power ? formData.power.trim().toUpperCase() : null,
        displacement: formData.displacement ? formData.displacement.trim().toUpperCase() : null,
        insuranceProvider: formData.insuranceProvider ? formData.insuranceProvider.trim().toUpperCase() : null,
        tracker: formData.tracker ? formData.tracker.trim().toUpperCase() : null,
        notes: formData.notes ? formData.notes.trim().toUpperCase() : null,
      };

      if (isEditing && selectedVehicleId) {
        await api.vehicles.update(selectedVehicleId, payload);
        toastSuccess('Veículo atualizado!', `Veículo ${cleanPlate} atualizado com sucesso na frota.`);
      } else {
        await api.vehicles.create(payload);
        toastSuccess('Veículo cadastrado!', `Veículo ${cleanPlate} cadastrado com sucesso na frota.`);
      }
      handleCloseModal();
      fetchVehicles();
    } catch (err: any) {
      toastError('Erro ao salvar veículo', err.message || 'Verifique os dados preenchidos.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVehicle = async (vehicle: Vehicle) => {
    if (!confirm(`Deseja realmente remover o veículo ${vehicle.plate} (${vehicle.brand} ${vehicle.model})?`)) return;

    try {
      await api.vehicles.delete(vehicle.id);
      toastSuccess('Veículo removido da frota.');
      fetchVehicles();
    } catch (err: any) {
      toastError('Erro ao remover', err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Car className="w-6 h-6 text-emerald-600" />
            Gestão da Frota de Veículos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Controle de inventário, cadastro e especificações de veículos, precificação, quilometragem e manutenção.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Grid / Table Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md ${
                viewMode === 'table' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Visualização em Tabela"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md ${
                viewMode === 'grid' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Visualização em Grade"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <Button onClick={handleOpenCreate} variant="primary" size="md" className="gap-2 font-bold shadow-xs">
            <Plus className="w-4 h-4" />
            Novo Veículo
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por Placa, Marca, Modelo ou Renavam..."
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
                <option value="AVAILABLE">Disponíveis (Para Alugar)</option>
                <option value="RENTED">Alugados (Em Contrato)</option>
                <option value="MAINTENANCE">Em Manutenção</option>
                <option value="BLOCKED">Bloqueados</option>
                <option value="SOLD">Vendidos</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Categorias: Todas</option>
                <option value="HATCH COMPACTO">Hatch Compacto</option>
                <option value="SEDAN COMPACTO">Sedan Compacto</option>
                <option value="SEDAN MÉDIO">Sedan Médio</option>
                <option value="SUV COMPACTO">SUV Compacto</option>
                <option value="UTILITÁRIO">Utilitário</option>
              </select>

              <Button type="submit" variant="secondary" size="sm" className="text-xs font-bold shrink-0">
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Vehicles View: Table or Grid */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <Card>
          <div className="p-12 text-center text-slate-400 text-xs">
            <Car className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-slate-700">Nenhum veículo encontrado</p>
            <p className="text-slate-400 mt-0.5">Adicione veículos à frota ou ajuste os filtros.</p>
          </div>
        </Card>
      ) : viewMode === 'table' ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Placa / Veículo</th>
                    <th className="px-4 py-3.5">Categoria / Ano</th>
                    <th className="px-4 py-3.5">Quilometragem</th>
                    <th className="px-4 py-3.5">Tarifas (Semanal / Mensal)</th>
                    <th className="px-4 py-3.5">Rastreador & Seguro</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {vehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold bg-slate-900 text-white px-2 py-1 rounded text-xs tracking-wider shadow-2xs">
                            {maskPlate(v.plate)}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900">{v.brand} {v.model}</div>
                            <div className="text-slate-400 text-[11px] mt-0.5">{v.color} • {v.fuel}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">
                        <div className="font-bold">{v.category}</div>
                        <div className="text-[11px] text-slate-400">
                          {v.manufactureYear}/{v.modelYear}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {maskMileage(v.currentMileage)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-700">
                        <div><strong className="text-emerald-700">{maskCurrency(v.weeklyRate)}</strong>/sem</div>
                        <div className="text-[10px] text-slate-500">{maskCurrency(v.monthlyRate)}/mês</div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-[11px]">
                        <div className="flex items-center gap-1">
                          <Radio className="w-3 h-3 text-emerald-500" />
                          <span className="truncate max-w-[120px]">{v.tracker || 'GPS 4G'}</span>
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          {v.insuranceProvider || 'Seguro Vigente'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={v.status}>{v.status}</Badge>
                        {v.activeRental && (
                          <div className="text-[10px] text-blue-600 font-semibold truncate max-w-[120px] mt-0.5">
                            Loc: {v.activeRental.clientName}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetails(v)}
                            title="Ver Ficha Completa do Veículo"
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(v)}
                            title="Editar Veículo"
                            className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteVehicle(v)}
                            title="Excluir Veículo"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {vehicles.map((v) => (
            <Card key={v.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <span className="font-mono font-black bg-slate-900 text-white px-2.5 py-1 rounded-md text-xs tracking-wider shadow-2xs">
                  {maskPlate(v.plate)}
                </span>
                <Badge variant={v.status}>{v.status}</Badge>
              </div>

              <CardContent className="p-4 space-y-3 text-xs">
                <div>
                  <h3 className="font-black text-slate-900 text-base">{v.brand} {v.model}</h3>
                  <p className="text-slate-500 text-xs">{v.version || v.category} • {v.manufactureYear}/{v.modelYear}</p>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-lg text-[11px] text-slate-600">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">KM Atual</span>
                    <span className="font-bold text-slate-800 text-xs">{maskMileage(v.currentMileage)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Semanal</span>
                    <span className="font-bold text-emerald-700 text-xs">{maskCurrency(v.weeklyRate)}</span>
                  </div>
                </div>

                {v.activeRental && (
                  <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-100 text-[11px] text-blue-900">
                    <span className="font-bold block">Alugado para:</span>
                    <span className="truncate block font-medium">{v.activeRental.clientName}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400">
                    Mensal: <strong>{maskCurrency(v.monthlyRate)}</strong>
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDetails(v)}>
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(v)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Vehicle Registration & Edit Modal - 100% Manual */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isEditing ? `Editar Veículo ${formData.plate}` : 'Cadastrar Novo Veículo na Frota'}
        description="Preenchimento manual dos dados cadastrais, técnicos e financeiros do veículo."
        maxWidth="4xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-6">
          {/* SEÇÃO 1: DADOS PRINCIPAIS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
              <Car className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                1. Dados Principais do Veículo
              </h3>
            </div>

            {/* Placa do Veículo com Validação Visual */}
            <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-bold tracking-wider text-slate-200 uppercase block">
                    Placa do Veículo (Mercosul ou Tradicional) *
                  </label>
                  <p className="text-[11px] text-slate-400">
                    Conversão automática em maiúsculas sem espaços. Padrão Mercosul (ABC1D23) ou Tradicional (ABC-1234).
                  </p>
                </div>
                <div>
                  {(() => {
                    const clean = formData.plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                    const isMerc = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(clean);
                    const isTrad = /^[A-Z]{3}[0-9]{4}$/.test(clean);
                    if (isMerc) {
                      return (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Padrão Mercosul Válido
                        </span>
                      );
                    }
                    if (isTrad) {
                      return (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                          Padrão Tradicional Válido
                        </span>
                      );
                    }
                    if (clean.length >= 7) {
                      return (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                          Formato de Placa Inválido
                        </span>
                      );
                    }
                    return (
                      <span className="text-[11px] text-slate-400 font-mono">
                        {7 - clean.length} caracteres para validar
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <input
                  type="text"
                  placeholder="EX: BRA2E19 OU ABC-1234"
                  maxLength={8}
                  value={formData.plate}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\s+/g, '').toUpperCase().slice(0, 8);
                    setFormData({ ...formData, plate: raw });
                  }}
                  required
                  className="w-full sm:w-64 bg-slate-950 border border-slate-700 text-white font-mono font-black text-xl tracking-widest px-4 py-2.5 rounded-lg uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-600"
                />
                <span className="text-xs text-slate-400 self-center">
                  Preenchimento manual — sem integrações externas
                </span>
              </div>
            </div>

            {/* Marca, Modelo e Versão */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="MARCA / FABRICANTE *"
                placeholder="EX: CHEVROLET, FIAT, HYUNDAI..."
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value.toUpperCase() })}
                required
              />
              <Input
                label="MODELO DO VEÍCULO *"
                placeholder="EX: ONIX, ARGO, HB20, POLO..."
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value.toUpperCase() })}
                required
              />
              <Input
                label="VERSÃO / MOTORIZAÇÃO"
                placeholder="EX: 1.0 TURBO LT MANUAL"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value.toUpperCase() })}
              />
            </div>

            {/* Anos, Cor, Combustível, Categoria, Tipo e Status */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input
                label="ANO FABRICAÇÃO *"
                type="number"
                value={formData.manufactureYear}
                onChange={(e) => setFormData({ ...formData, manufactureYear: parseInt(e.target.value) || 2024 })}
                required
              />
              <Input
                label="ANO MODELO *"
                type="number"
                value={formData.modelYear}
                onChange={(e) => setFormData({ ...formData, modelYear: parseInt(e.target.value) || 2024 })}
                required
              />
              <Input
                label="COR PREDOMINANTE *"
                placeholder="EX: BRANCO, PRATA, PRETO"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value.toUpperCase() })}
                required
              />
              <Select
                label="COMBUSTÍVEL *"
                value={formData.fuel}
                onChange={(e) => setFormData({ ...formData, fuel: e.target.value })}
              >
                <option value="FLEX">FLEX (ÁLCOOL/GASOLINA)</option>
                <option value="GASOLINA">GASOLINA</option>
                <option value="ETANOL">ETANOL</option>
                <option value="DIESEL">DIESEL</option>
                <option value="ELETRICO">ELÉTRICO</option>
                <option value="HIBRIDO">HÍBRIDO</option>
                <option value="GNV">GNV (GÁS NATURAL)</option>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="CATEGORIA OPERACIONAL *"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="HATCH COMPACTO">HATCH COMPACTO</option>
                <option value="SEDAN COMPACTO">SEDAN COMPACTO</option>
                <option value="SEDAN MÉDIO">SEDAN MÉDIO</option>
                <option value="SUV COMPACTO">SUV COMPACTO</option>
                <option value="SUV MÉDIO">SUV MÉDIO</option>
                <option value="UTILITÁRIO / PICKUP">UTILITÁRIO / PICKUP</option>
                <option value="EXECUTIVO / LUXO">EXECUTIVO / LUXO</option>
                <option value="MINIVAN">MINIVAN</option>
                <option value="VAN DE CARGA">VAN DE CARGA</option>
              </Select>

              <Select
                label="TIPO DO VEÍCULO *"
                value={formData.vehicleType}
                onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
              >
                <option value="CARRO DE PASSEIO">CARRO DE PASSEIO</option>
                <option value="UTILITÁRIO">UTILITÁRIO</option>
                <option value="PICKUP">PICKUP</option>
                <option value="SUV">SUV</option>
                <option value="VAN / MINIVAN">VAN / MINIVAN</option>
                <option value="MOTOCICLETA">MOTOCICLETA</option>
                <option value="CAMINHÃO LEVE">CAMINHÃO LEVE</option>
              </Select>

              <Select
                label="STATUS DO VEÍCULO *"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as VehicleStatus })}
              >
                <option value="AVAILABLE">DISPONÍVEL (PRONTO P/ LOCAÇÃO)</option>
                <option value="RENTED">ALUGADO (EM CONTRATO)</option>
                <option value="MAINTENANCE">EM MANUTENÇÃO (OFICINA)</option>
                <option value="BLOCKED">BLOQUEADO (RESTRITO)</option>
                <option value="RESERVED">RESERVADO</option>
                <option value="SOLD">VENDIDO</option>
              </Select>
            </div>
          </div>

          {/* SEÇÃO 2: DADOS TÉCNICOS */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
              <Gauge className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                2. Dados Técnicos do Veículo
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="CÓDIGO RENAVAM"
                placeholder="EX: 00123456789 (MÁX 11 DÍGITOS)"
                value={formData.renavam}
                maxLength={11}
                onChange={(e) => setFormData({ ...formData, renavam: maskRenavam(e.target.value) })}
                helperText="Somente números (11 dígitos)"
              />
              <Input
                label="NÚMERO DO CHASSI"
                placeholder="EX: 9BWCA05U1BP000000"
                maxLength={17}
                value={formData.chassis}
                onChange={(e) => setFormData({ ...formData, chassis: e.target.value.toUpperCase() })}
                helperText="Padrão VIN de 17 caracteres"
              />
              <Input
                label="NÚMERO DO MOTOR"
                placeholder="EX: EA211-123456"
                value={formData.engine}
                onChange={(e) => setFormData({ ...formData, engine: e.target.value.toUpperCase() })}
                helperText="Identificador gravado no bloco"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input
                label="QUILOMETRAGEM ATUAL (KM) *"
                type="number"
                value={formData.currentMileage}
                onChange={(e) => setFormData({ ...formData, currentMileage: parseInt(e.target.value) || 0 })}
                required
              />
              <Input
                label="POTÊNCIA (CV / HP)"
                placeholder="EX: 116 CV"
                value={formData.power}
                onChange={(e) => setFormData({ ...formData, power: e.target.value.toUpperCase() })}
              />
              <Input
                label="CILINDRADAS"
                placeholder="EX: 1.0 OU 999 CC"
                value={formData.displacement}
                onChange={(e) => setFormData({ ...formData, displacement: e.target.value.toUpperCase() })}
              />
              <Input
                label="CAPACIDADE DE PASSAGEIROS"
                type="number"
                min={1}
                max={25}
                value={formData.passengerCapacity}
                onChange={(e) => setFormData({ ...formData, passengerCapacity: parseInt(e.target.value) || 5 })}
              />
            </div>
          </div>

          {/* SEÇÃO 3: DADOS FINANCEIROS & TARIFAS */}
          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-emerald-200">
              <DollarSign className="w-4 h-4 text-emerald-700" />
              <h3 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                3. Dados Financeiros & Tarifas de Locação
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="VALOR DE AQUISIÇÃO (R$)"
                type="number"
                step="0.01"
                value={formData.purchaseValue}
                onChange={(e) => setFormData({ ...formData, purchaseValue: parseFloat(e.target.value) || 0 })}
                helperText="Custo de compra / investimento no veículo"
              />
              <Input
                label="DATA DE AQUISIÇÃO"
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                helperText="Data da nota fiscal ou inclusão no ativo"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <Input
                label="VALOR DA DIÁRIA (R$) *"
                type="number"
                value={formData.dailyRate}
                onChange={(e) => setFormData({ ...formData, dailyRate: parseFloat(e.target.value) || 0 })}
                required
              />
              <Input
                label="VALOR SEMANAL (R$) *"
                type="number"
                value={formData.weeklyRate}
                onChange={(e) => setFormData({ ...formData, weeklyRate: parseFloat(e.target.value) || 0 })}
                required
              />
              <Input
                label="VALOR QUINZENAL (R$)"
                type="number"
                value={formData.biweeklyRate}
                onChange={(e) => setFormData({ ...formData, biweeklyRate: parseFloat(e.target.value) || 0 })}
              />
              <Input
                label="VALOR MENSAL (R$) *"
                type="number"
                value={formData.monthlyRate}
                onChange={(e) => setFormData({ ...formData, monthlyRate: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Input
                label="FRANQUIA DE KM (PADRÃO / CONTRATO)"
                type="number"
                value={formData.mileageAllowance}
                onChange={(e) => setFormData({ ...formData, mileageAllowance: parseInt(e.target.value) || 0 })}
                helperText="KM incluso na franquia contratada"
              />
              <Input
                label="VALOR POR KM EXCEDENTE (R$)"
                type="number"
                step="0.01"
                value={formData.excessMileageRate}
                onChange={(e) => setFormData({ ...formData, excessMileageRate: parseFloat(e.target.value) || 0 })}
                helperText="Cobrado por cada KM rodado acima da franquia"
              />
            </div>
          </div>

          {/* SEÇÃO 4: OUTROS / EQUIPAMENTOS & OBSERVAÇÕES */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-200">
              <Shield className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                4. Outros: Seguro, Rastreador e Observações
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="SEGURADORA & APÓLICE"
                placeholder="EX: PORTO SEGURO APÓLICE #998877"
                value={formData.insuranceProvider}
                onChange={(e) => setFormData({ ...formData, insuranceProvider: e.target.value.toUpperCase() })}
              />
              <Input
                label="VENCIMENTO DO SEGURO"
                type="date"
                value={formData.insuranceExpiration}
                onChange={(e) => setFormData({ ...formData, insuranceExpiration: e.target.value })}
              />
              <Input
                label="RASTREADOR & TELEMETRIA"
                placeholder="EX: ITURAN GPS 4G COM CORTE REMOTO"
                value={formData.tracker}
                onChange={(e) => setFormData({ ...formData, tracker: e.target.value.toUpperCase() })}
              />
            </div>

            <Input
              label="OBSERVAÇÕES DO VEÍCULO"
              placeholder="EX: INSTALADO GNV 5ª GERAÇÃO, ESTEPE NOVO, CHAVE RESERVA NA SEDE..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value.toUpperCase() })}
            />
          </div>

          {/* Botões de Ação do Modal */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving} className="font-bold">
              {isEditing ? 'Salvar Alterações' : 'Cadastrar Veículo na Frota'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Vehicle Details Modal */}
      {viewingVehicle && (
        <Modal
          isOpen={!!viewingVehicle}
          onClose={() => setViewingVehicle(null)}
          title={`Ficha do Veículo: ${viewingVehicle.brand} ${viewingVehicle.model} (${maskPlate(viewingVehicle.plate)})`}
          description={`ID de Controle: ${viewingVehicle.id}`}
          maxWidth="4xl"
        >
          <div className="space-y-6 text-xs">
            {/* Top Overview Badge */}
            <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-mono font-black text-lg bg-emerald-600 px-3 py-1.5 rounded-lg">
                  {maskPlate(viewingVehicle.plate)}
                </span>
                <div>
                  <h3 className="text-base font-bold">{viewingVehicle.brand} {viewingVehicle.model} {viewingVehicle.version}</h3>
                  <p className="text-xs text-slate-300">
                    {viewingVehicle.vehicleType || 'CARRO'} • {viewingVehicle.category} • {viewingVehicle.manufactureYear}/{viewingVehicle.modelYear} • Cor: {viewingVehicle.color}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={viewingVehicle.status} className="text-sm px-3 py-1">
                  {viewingVehicle.status}
                </Badge>
              </div>
            </div>

            {/* Grid with specs & rates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <h4 className="font-bold uppercase text-slate-800 flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-emerald-600" />
                  Especificações Técnicas
                </h4>
                <div className="space-y-1 text-slate-600">
                  <p><strong>Tipo do Veículo:</strong> {viewingVehicle.vehicleType || 'CARRO DE PASSEIO'}</p>
                  <p><strong>Quilometragem Atual:</strong> {maskMileage(viewingVehicle.currentMileage)}</p>
                  <p><strong>Combustível:</strong> {viewingVehicle.fuel}</p>
                  <p><strong>Renavam:</strong> {viewingVehicle.renavam || 'N/A'}</p>
                  <p><strong>Chassi:</strong> {viewingVehicle.chassis || 'N/A'}</p>
                  <p><strong>Motor:</strong> {viewingVehicle.engine || 'N/A'}</p>
                  <p><strong>Potência:</strong> {viewingVehicle.power || 'N/A'}</p>
                  <p><strong>Cilindradas:</strong> {viewingVehicle.displacement || 'N/A'}</p>
                  <p><strong>Capacidade Passageiros:</strong> {viewingVehicle.passengerCapacity || 5} pessoas</p>
                  <p><strong>Rastreador:</strong> {viewingVehicle.tracker || 'Não instalado'}</p>
                  <p><strong>Seguradora:</strong> {viewingVehicle.insuranceProvider || 'N/A'}</p>
                  {viewingVehicle.notes && (
                    <p><strong>Observações:</strong> {viewingVehicle.notes}</p>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <h4 className="font-bold uppercase text-slate-800 flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  Dados Financeiros & Tarifas
                </h4>
                <div className="space-y-1 text-slate-600">
                  <p><strong>Valor de Aquisição:</strong> {maskCurrency(viewingVehicle.purchaseValue || 0)}</p>
                  <p><strong>Data de Aquisição:</strong> {viewingVehicle.purchaseDate ? formatDate(viewingVehicle.purchaseDate) : 'N/A'}</p>
                  <p><strong>Diária:</strong> {maskCurrency(viewingVehicle.dailyRate)}</p>
                  <p><strong>Semanal:</strong> {maskCurrency(viewingVehicle.weeklyRate)}</p>
                  <p><strong>Quinzenal:</strong> {maskCurrency(viewingVehicle.biweeklyRate || 0)}</p>
                  <p><strong>Mensal:</strong> {maskCurrency(viewingVehicle.monthlyRate)}</p>
                  <p><strong>Franquia de KM:</strong> {viewingVehicle.mileageAllowance || 0} KM</p>
                  <p><strong>Taxa KM Excedente:</strong> {maskCurrency(viewingVehicle.excessMileageRate || 0.45)}/KM</p>
                </div>
              </div>
            </div>

            {/* Active Rental info if rented */}
            {viewingVehicle.activeRental && (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 space-y-1">
                <h4 className="font-bold uppercase text-xs flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-blue-600" />
                  Locação Ativa no Momento
                </h4>
                <p><strong>Cliente:</strong> {viewingVehicle.activeRental.clientName}</p>
                <p><strong>Contrato:</strong> {viewingVehicle.activeRental.rentalNumber}</p>
                <p><strong>Início:</strong> {formatDate(viewingVehicle.activeRental.startDate)} até {formatDate(viewingVehicle.activeRental.endDate)}</p>
                <p><strong>Valor:</strong> {maskCurrency(viewingVehicle.activeRental.amount)}</p>
              </div>
            )}

            {/* Mileage Ledger */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-emerald-600" />
                Histórico de Quilometragem
              </h4>
              {(!viewingVehicle.mileageHistory || viewingVehicle.mileageHistory.length === 0) ? (
                <div className="p-3 rounded-lg bg-slate-50 text-slate-400 text-center">
                  Nenhum registro no diário de quilometragem.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2">Data / Hora</th>
                        <th className="px-4 py-2">KM</th>
                        <th className="px-4 py-2">Tipo</th>
                        <th className="px-4 py-2">Notas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingVehicle.mileageHistory.map((m: any) => (
                        <tr key={m.id}>
                          <td className="px-4 py-2">{formatDateTime(m.date)}</td>
                          <td className="px-4 py-2 font-bold">{maskMileage(m.mileage)}</td>
                          <td className="px-4 py-2">{m.type}</td>
                          <td className="px-4 py-2 text-slate-500">{m.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setViewingVehicle(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

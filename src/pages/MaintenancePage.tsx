import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useToast } from '../components/ui/Toast';
import { maskCurrency, formatDate, maskMileage } from '../utils/formatters';
import {
  Wrench,
  Plus,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react';

type MaintenanceItem = {
  id: string;
  codigo?: string;
  vehicleId: string;
  type: string;
  status: string;
  titulo: string;
  descricao: string;
  dataAgendamento: string;
  custoTotal: number;
  workshop?: string | null;
  vehicle?: {
    id: string;
    plate: string;
    brand: string;
    model: string;
    currentMileage: number;
    status: string;
  } | null;
};

type VehicleOption = {
  id: string;
  plate: string;
  brand: string;
  model: string;
  currentMileage: number;
  status: string;
};

const TYPE_OPTIONS = [
  ['PREVENTIVE', 'PREVENTIVA'],
  ['CORRECTIVE', 'CORRETIVA'],
  ['EMERGENCY', 'EMERGÊNCIA'],
  ['INSPECTION', 'INSPEÇÃO'],
  ['OIL_CHANGE', 'TROCA DE ÓLEO'],
  ['TIRES', 'PNEUS'],
  ['BRAKES', 'FREIOS'],
  ['SUSPENSION', 'SUSPENSÃO'],
  ['ELECTRICAL', 'ELÉTRICA'],
  ['ENGINE', 'MOTOR'],
  ['OTHER', 'OUTROS'],
] as const;

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'AGENDADA',
  IN_PROGRESS: 'EM EXECUÇÃO',
  WAITING_PARTS: 'AGUARDANDO PEÇAS',
  COMPLETED: 'CONCLUÍDA',
  CANCELLED: 'CANCELADA',
};

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  TYPE_OPTIONS.map(([value, label]) => [value, label])
);

const todayDateOnly = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const MaintenancePage: React.FC = () => {
  const { success: toastSuccess, error: toastError } = useToast();

  const [maintenances, setMaintenances] = useState<MaintenanceItem[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [kpis, setKpis] = useState({
    scheduledCount: 0,
    inProgressCount: 0,
    monthCost: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceItem | null>(null);
  const [valorReal, setValorReal] = useState(0);
  const [kmConclusao, setKmConclusao] = useState(0);
  const [observacaoConclusao, setObservacaoConclusao] = useState('');

  const [vehicleId, setVehicleId] = useState('');
  const [type, setType] = useState('PREVENTIVE');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [kmEntrada, setKmEntrada] = useState(0);
  const [dataAgendamento, setDataAgendamento] = useState(todayDateOnly());
  const [custoOutros, setCustoOutros] = useState(0);
  const [workshop, setWorkshop] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === vehicleId) || null,
    [vehicles, vehicleId]
  );

  const loadData = async () => {
    setIsLoading(true);

    try {
      const [listResponse, dashboardResponse, vehiclesResponse] =
        await Promise.all([
          api.maintenance.list(),
          api.maintenance.dashboard(),
          api.vehicles.list(),
        ]);

      setMaintenances(listResponse.data || []);
      setKpis({
        scheduledCount: dashboardResponse.kpis?.scheduledCount || 0,
        inProgressCount: dashboardResponse.kpis?.inProgressCount || 0,
        monthCost: dashboardResponse.kpis?.monthCost || 0,
      });
      setVehicles(vehiclesResponse.data || []);
    } catch (err: any) {
      toastError(
        'Erro ao carregar manutenção',
        err?.message || 'Não foi possível consultar os dados.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedVehicle) {
      setKmEntrada(selectedVehicle.currentMileage || 0);
    }
  }, [selectedVehicle]);

  const resetForm = () => {
    setVehicleId('');
    setType('PREVENTIVE');
    setTitulo('');
    setDescricao('');
    setKmEntrada(0);
    setDataAgendamento(todayDateOnly());
    setCustoOutros(0);
    setWorkshop('');
    setObservacoes('');
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openCompleteModal = (maintenance: MaintenanceItem) => {
    setSelectedMaintenance(maintenance);
    setValorReal(Number(maintenance.custoTotal || 0));
    setKmConclusao(Number(maintenance.vehicle?.currentMileage || 0));
    setObservacaoConclusao('');
    setIsCompleteModalOpen(true);
  };

  const handleComplete = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedMaintenance) return;

    if (!Number.isFinite(valorReal) || valorReal <= 0) {
      toastError(
        'Valor inválido',
        'Informe o valor real da manutenção. Esse valor será lançado no financeiro.'
      );
      return;
    }

    if (!Number.isInteger(kmConclusao) || kmConclusao < (selectedMaintenance.vehicle?.currentMileage || 0)) {
      toastError(
        'KM inválido',
        'O KM de conclusão não pode ser inferior ao KM atual do veículo.'
      );
      return;
    }

    setActionId(selectedMaintenance.id);

    try {
      await api.maintenance.complete(selectedMaintenance.id, {
        valorReal,
        kmConclusao,
        observacoes: observacaoConclusao,
      });

      toastSuccess(
        'Manutenção concluída',
        `O valor real de ${maskCurrency(valorReal)} foi lançado no financeiro.`
      );
      setIsCompleteModalOpen(false);
      setSelectedMaintenance(null);
      await loadData();
    } catch (err: any) {
      toastError(
        'Não foi possível concluir a manutenção',
        err?.message || 'Verifique os dados e tente novamente.'
      );
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (maintenance: MaintenanceItem) => {
    const vehiclePlate = maintenance.vehicle?.plate || 'este veículo';
    const codigo = maintenance.codigo ? ` ${maintenance.codigo}` : '';

    if (!window.confirm(`Excluir definitivamente a ordem${codigo} do veículo ${vehiclePlate}?\n\nEsta ação não poderá ser desfeita.`)) {
      return;
    }

    setActionId(maintenance.id);

    try {
      await api.maintenance.delete(maintenance.id);
      toastSuccess(
        'Ordem excluída',
        'A ordem de manutenção foi removida com sucesso.'
      );
      await loadData();
    } catch (err: any) {
      toastError(
        'Não foi possível excluir a ordem',
        err?.message || 'Tente novamente.'
      );
    } finally {
      setActionId(null);
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!vehicleId) {
      toastError('Veículo obrigatório', 'Selecione o veículo da manutenção.');
      return;
    }

    if (!titulo.trim() || !descricao.trim()) {
      toastError(
        'Dados obrigatórios',
        'Informe o título e a descrição do serviço.'
      );
      return;
    }

    if (kmEntrada < 0) {
      toastError('KM inválido', 'O KM de entrada não pode ser negativo.');
      return;
    }

    setIsSaving(true);

    try {
      await api.maintenance.create({
        vehicleId,
        type,
        status: 'SCHEDULED',
        titulo,
        descricao,
        kmEntrada,
        dataAgendamento,
        custoOutros,
        observacoes,
        workshop,
        services: [],
        parts: [],
      });

      toastSuccess(
        'Ordem criada com sucesso',
        'A manutenção foi gravada no banco de dados.'
      );

      setIsModalOpen(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      toastError(
        'Não foi possível criar a ordem',
        err?.message || 'Verifique os dados e tente novamente.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-emerald-600" />
            Controle de Manutenção & Oficinas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ordens de serviço, manutenção preventiva, corretiva, trocas de óleo e revisões programadas por quilometragem.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="md"
            className="gap-2 font-bold"
            onClick={loadData}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            variant="primary"
            size="md"
            className="gap-2 font-bold shadow-xs"
            onClick={openCreateModal}
          >
            <Plus className="w-4 h-4" />
            Nova Ordem de Serviço
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-amber-200 bg-amber-50/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-100 text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase text-amber-900">Agendadas</span>
              <div className="text-xl font-black text-slate-900">
                {isLoading
                  ? '...'
                  : `${kpis.scheduledCount} ${kpis.scheduledCount === 1 ? 'Manutenção' : 'Manutenções'}`}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-blue-200 bg-blue-50/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase text-blue-900">Em Execução</span>
              <div className="text-xl font-black text-slate-900">
                {isLoading
                  ? '...'
                  : `${kpis.inProgressCount} ${kpis.inProgressCount === 1 ? 'Veículo na Oficina' : 'Veículos na Oficina'}`}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-emerald-200 bg-emerald-50/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase text-emerald-900">Concluídas este mês</span>
              <div className="text-xl font-black text-slate-900">
                {isLoading ? '...' : maskCurrency(kpis.monthCost)}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Ordens de Serviço Registradas</CardTitle>
          <span className="text-[11px] font-bold text-slate-400">
            {maintenances.length} {maintenances.length === 1 ? 'registro' : 'registros'}
          </span>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Veículo</th>
                  <th className="px-4 py-3.5">Tipo & Descrição</th>
                  <th className="px-4 py-3.5">Oficina Prestadora</th>
                  <th className="px-4 py-3.5">Data Agendada</th>
                  <th className="px-4 py-3.5">Custo Estimado</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Carregando dados reais...
                      </div>
                    </td>
                  </tr>
                ) : maintenances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                      Nenhuma ordem de manutenção cadastrada para esta empresa.
                    </td>
                  </tr>
                ) : (
                  maintenances.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <span className="font-mono font-bold bg-slate-900 text-white px-2 py-0.5 rounded text-[11px]">
                          {m.vehicle?.plate || '—'}
                        </span>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          {m.vehicle
                            ? `${m.vehicle.brand} ${m.vehicle.model}`
                            : 'Veículo não encontrado'}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 max-w-sm">
                        <div className="font-bold text-slate-900">
                          {TYPE_LABELS[m.type] || m.type}
                        </div>
                        <div className="text-slate-500 text-[11px] line-clamp-1">
                          {m.descricao || m.titulo}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-700">
                        {m.workshop || '—'}
                      </td>

                      <td className="px-4 py-3.5 text-slate-600">
                        {m.dataAgendamento ? formatDate(m.dataAgendamento) : '—'}
                      </td>

                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {maskCurrency(m.custoTotal || 0)}
                      </td>

                      <td className="px-4 py-3.5">
                        <Badge variant={m.status as any}>
                          {STATUS_LABELS[m.status] || m.status}
                        </Badge>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          {(m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS') && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-bold"
                              onClick={() => openCompleteModal(m)}
                              disabled={actionId === m.id}
                              title="Confirmar conclusão da manutenção"
                            >
                              {actionId === m.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              {m.status === 'SCHEDULED' ? 'Confirmar' : 'Concluir'}
                            </Button>
                          )}

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="px-2 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleDelete(m)}
                            disabled={actionId === m.id}
                            title="Excluir ordem de manutenção"
                          >
                            {actionId === m.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>


      <Modal
        isOpen={isCompleteModalOpen}
        onClose={() => !actionId && setIsCompleteModalOpen(false)}
        title="Confirmar manutenção"
        description={
          selectedMaintenance
            ? `Informe o valor real pago pela manutenção ${selectedMaintenance.codigo || ''}. Esse valor será lançado como despesa no financeiro.`
            : 'Informe os dados finais da manutenção.'
        }
        maxWidth="md"
      >
        <form onSubmit={handleComplete} className="space-y-4 text-xs">
          {selectedMaintenance && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
              <div className="font-bold text-emerald-900">
                {selectedMaintenance.vehicle?.plate || '—'} — {selectedMaintenance.vehicle?.brand || ''} {selectedMaintenance.vehicle?.model || ''}
              </div>
              <div className="text-[11px] text-slate-600 mt-1">
                {TYPE_LABELS[selectedMaintenance.type] || selectedMaintenance.type} · {selectedMaintenance.descricao || selectedMaintenance.titulo}
              </div>
            </div>
          )}

          <Input
            label="VALOR REAL DA MANUTENÇÃO (R$)"
            type="number"
            min={0.01}
            step="0.01"
            value={valorReal}
            onChange={(event) => setValorReal(Number(event.target.value) || 0)}
            required
          />

          <Input
            label="KM DE CONCLUSÃO"
            type="number"
            min={0}
            value={kmConclusao}
            onChange={(event) => setKmConclusao(Number(event.target.value) || 0)}
            required
          />

          <Input
            label="OBSERVAÇÃO DA CONCLUSÃO"
            value={observacaoConclusao}
            onChange={(event) => setObservacaoConclusao(event.target.value)}
            placeholder="Ex.: Serviço concluído e veículo liberado."
          />

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-[11px] text-blue-900">
            <strong>Atenção:</strong> ao confirmar, a OS será marcada como concluída, o KM do veículo será atualizado e o valor informado será registrado no Financeiro como uma despesa de manutenção.
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCompleteModalOpen(false)}
              disabled={!!actionId}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={!!actionId}
              className="font-bold gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Confirmar e lançar no financeiro
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isModalOpen}
        onClose={() => !isSaving && setIsModalOpen(false)}
        title="Nova Ordem de Serviço"
        description="Registre uma manutenção real para um veículo da sua frota."
        maxWidth="2xl"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select
              label="VEÍCULO"
              value={vehicleId}
              onChange={(event) => setVehicleId(event.target.value)}
              required
            >
              <option value="">Selecione o veículo</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.plate} — {vehicle.brand} {vehicle.model}
                </option>
              ))}
            </Select>

            <Select
              label="TIPO DE MANUTENÇÃO"
              value={type}
              onChange={(event) => setType(event.target.value)}
              required
            >
              {TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          {selectedVehicle && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-slate-700">
              <div className="font-bold text-emerald-900">
                {selectedVehicle.plate} — {selectedVehicle.brand} {selectedVehicle.model}
              </div>
              <div className="text-[11px] mt-1">
                KM atual:{' '}
                <strong>{maskMileage(selectedVehicle.currentMileage || 0)}</strong>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="TÍTULO"
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              placeholder="Ex.: Revisão preventiva 40.000 KM"
              required
            />

            <Input
              label="DATA AGENDADA"
              type="date"
              value={dataAgendamento}
              onChange={(event) => setDataAgendamento(event.target.value)}
              required
            />
          </div>

          <Input
            label="DESCRIÇÃO"
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            placeholder="Descreva o serviço que será realizado..."
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="KM DE ENTRADA"
              type="number"
              min={0}
              value={kmEntrada}
              onChange={(event) => setKmEntrada(Number(event.target.value) || 0)}
              required
            />

            <Input
              label="CUSTO ESTIMADO / OUTROS (R$)"
              type="number"
              min={0}
              step="0.01"
              value={custoOutros}
              onChange={(event) => setCustoOutros(Number(event.target.value) || 0)}
            />

            <Input
              label="OFICINA"
              value={workshop}
              onChange={(event) => setWorkshop(event.target.value)}
              placeholder="Nome da oficina"
            />
          </div>

          <Input
            label="OBSERVAÇÕES"
            value={observacoes}
            onChange={(event) => setObservacoes(event.target.value)}
            placeholder="Informações adicionais..."
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              className="font-bold"
            >
              Criar Ordem de Serviço
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MaintenancePage;

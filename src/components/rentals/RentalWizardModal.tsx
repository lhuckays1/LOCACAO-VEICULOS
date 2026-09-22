import React, { useState, useEffect } from 'react';
import { Client, Vehicle, BillingFrequency, DepositStatus } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { useToast } from '../ui/Toast';
import { api } from '../../services/api';
import {
  maskPlate,
  maskCurrency,
  maskMileage,
  maskCPFOrCNPJ,
  maskPhone,
  formatDate,
} from '../../utils/formatters';
import {
  User,
  Car,
  Calendar,
  DollarSign,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Fuel,
  Gauge,
  FileText,
  ShieldCheck,
} from 'lucide-react';

// Datas vindas de <input type="date"> são DATE-ONLY.
// Não usamos new Date("YYYY-MM-DD") + toISOString(), pois isso pode
// deslocar a data para o dia anterior em fusos como America/Sao_Paulo.
const parseDateOnly = (value: string): Date => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return new Date(NaN);
  }

  const [, year, month, day] = match;
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    12,
    0,
    0,
    0
  );
};

const dateOnlyToIso = (value: string): string => {
  const date = parseDateOnly(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Data inválida: ${value || 'não informada'}`);
  }

  // Meio-dia UTC evita que a serialização atravesse o dia anterior
  // quando o sistema estiver em um fuso negativo em relação ao UTC.
  return `${value}T12:00:00.000Z`;
};

interface RentalWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clients: Client[];
  availableVehicles: Vehicle[];
}

export const RentalWizardModal: React.FC<RentalWizardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clients,
  availableVehicles,
}) => {
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSaving, setIsSaving] = useState(false);

  // STEP 1: CLIENT & VEHICLE
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [cnhExpiredError, setCnhExpiredError] = useState<string | null>(null);

  // STEP 2: PERIOD & FINANCE
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>('SEMANAL');
  const [amount, setAmount] = useState<number>(550);
  const [quantityPeriods, setQuantityPeriods] = useState<number>(4);
  const [dueDay, setDueDay] = useState<number>(5);
  const [depositAmount, setDepositAmount] = useState<number>(1000);
  const [caucaoRecebida, setCaucaoRecebida] = useState<number>(1000);
  const [statusCaucao, setStatusCaucao] = useState<DepositStatus>('RECEBIDA');
  const [mileageAllowance, setMileageAllowance] = useState<number>(1000);
  const [excessMileageRate, setExcessMileageRate] = useState<number>(0.5);
  const [discount, setDiscount] = useState<number>(0);
  const [addition, setAddition] = useState<number>(0);

  // STEP 3: INSPECTION
  const [initialMileage, setInitialMileage] = useState<number>(0);
  const [initialFuelLevel, setInitialFuelLevel] = useState('CHEIO (1/1)');
  const [inspectorName, setInspectorName] = useState('OPERADOR DO SISTEMA');
  const [checklistItems, setChecklistItems] = useState([
    { item: 'Pneus e Calibragem', ok: true },
    { item: 'Estepe, Triângulo e Macaco', ok: true },
    { item: 'CRLV / Documentação no Veículo', ok: true },
    { item: 'Chave e Chave Reserva', ok: true },
    { item: 'Ar-condicionado e Vidros', ok: true },
    { item: 'Faróis e Lanternas', ok: true },
    { item: 'Nível de Óleo e Arrefecimento', ok: true },
    { item: 'Limpeza e Higienização', ok: true },
  ]);
  const [preExistingDamages, setPreExistingDamages] = useState('');
  const [contractNotes, setContractNotes] = useState('');

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setSelectedClientId('');
      setSelectedVehicleId('');
      setCnhExpiredError(null);
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      setBillingFrequency('SEMANAL');
      setAmount(550);
      setQuantityPeriods(4);
      setDueDay(5);
      setDepositAmount(1000);
      setCaucaoRecebida(1000);
      setStatusCaucao('RECEBIDA');
      setDiscount(0);
      setAddition(0);
      setInitialFuelLevel('CHEIO (1/1)');
      setPreExistingDamages('');
      setContractNotes('');
    }
  }, [isOpen]);

  // Recalculate estimated periods when dates change
  useEffect(() => {
    if (!startDate || !endDate) return;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

    if (billingFrequency === 'DIARIA') {
      setQuantityPeriods(diffDays);
    } else if (billingFrequency === 'SEMANAL') {
      setQuantityPeriods(Math.max(1, Math.ceil(diffDays / 7)));
    } else if (billingFrequency === 'QUINZENAL') {
      setQuantityPeriods(Math.max(1, Math.ceil(diffDays / 14)));
    } else if (billingFrequency === 'MENSAL') {
      setQuantityPeriods(Math.max(1, Math.ceil(diffDays / 30)));
    }
  }, [startDate, endDate, billingFrequency]);

  // Handle client selection with CNH check
  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      if (client.driverLicenseExpiration) {
        const expDate = new Date(client.driverLicenseExpiration);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expDate < today) {
          setCnhExpiredError(
            `Atenção: A CNH do cliente ${client.name} está VENCIDA desde ${formatDate(
              client.driverLicenseExpiration
            )}. Regularização necessária.`
          );
        } else {
          setCnhExpiredError(null);
        }
      } else {
        setCnhExpiredError(null);
      }
    } else {
      setCnhExpiredError(null);
    }
  };

  // Handle vehicle selection
  const handleVehicleChange = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    const vehicle = availableVehicles.find((v) => v.id === vehicleId);
    if (vehicle) {
      setInitialMileage(vehicle.currentMileage);
      setMileageAllowance(vehicle.mileageAllowance || 1000);
      setExcessMileageRate(vehicle.excessMileageRate || 0.5);

      if (billingFrequency === 'SEMANAL') {
        setAmount(vehicle.weeklyRate || 550);
      } else if (billingFrequency === 'MENSAL') {
        setAmount(vehicle.monthlyRate || 2200);
      } else if (billingFrequency === 'QUINZENAL') {
        setAmount(vehicle.biweeklyRate || vehicle.weeklyRate * 2 || 1100);
      } else {
        setAmount(vehicle.dailyRate || 100);
      }
    }
  };

  // Handle frequency change
  const handleFrequencyChange = (freq: BillingFrequency) => {
    setBillingFrequency(freq);
    const vehicle = availableVehicles.find((v) => v.id === selectedVehicleId);
    if (vehicle) {
      if (freq === 'SEMANAL') setAmount(vehicle.weeklyRate || 550);
      else if (freq === 'MENSAL') setAmount(vehicle.monthlyRate || 2200);
      else if (freq === 'QUINZENAL') setAmount(vehicle.biweeklyRate || vehicle.weeklyRate * 2 || 1100);
      else if (freq === 'DIARIA') setAmount(vehicle.dailyRate || 100);
    }
  };

  const toggleChecklistItem = (index: number) => {
    setChecklistItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ok: !item.ok } : item))
    );
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const selectedVehicle = availableVehicles.find((v) => v.id === selectedVehicleId);

  // Financial calculations
  const totalPeriodsValue = amount * quantityPeriods;
  const totalPredictedValue = Math.max(0, totalPeriodsValue - discount + addition);

  // Generated preview installments
  // A primeira parcela SEMPRE começa na data de início da locação.
  // Ex.: início 28/08 + cobrança semanal => 28/08, 04/09, 11/09...
  const previewInstallments = Array.from({ length: quantityPeriods }).map((_, i) => {
    const dueDateObj = parseDateOnly(startDate);

    if (i > 0) {
      if (billingFrequency === 'DIARIA') {
        dueDateObj.setDate(dueDateObj.getDate() + i);
      } else if (billingFrequency === 'SEMANAL') {
        dueDateObj.setDate(dueDateObj.getDate() + i * 7);
      } else if (billingFrequency === 'QUINZENAL') {
        dueDateObj.setDate(dueDateObj.getDate() + i * 15);
      } else {
        dueDateObj.setMonth(dueDateObj.getMonth() + i);
        dueDateObj.setDate(
          Math.min(
            dueDay || dueDateObj.getDate(),
            new Date(dueDateObj.getFullYear(), dueDateObj.getMonth() + 1, 0).getDate()
          )
        );
      }
    }

    return {
      numero: i + 1,
      vencimento: Number.isNaN(dueDateObj.getTime())
        ? ''
        : `${dueDateObj.getFullYear()}-${String(dueDateObj.getMonth() + 1).padStart(2, '0')}-${String(dueDateObj.getDate()).padStart(2, '0')}`,
      valor: amount,
      descricao: `Parcela ${i + 1}/${quantityPeriods} - Locação (${billingFrequency})`,
    };
  });

  // Step Navigations
  const goToStep2 = () => {
    if (!selectedClientId) {
      toastError('Cliente obrigatório', 'Selecione o motorista para a locação.');
      return;
    }
    if (!selectedVehicleId) {
      toastError('Veículo obrigatório', 'Selecione o veículo disponível na frota.');
      return;
    }
    setCurrentStep(2);
  };

  const goToStep3 = () => {
    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      toastError('Datas inválidas', 'Informe uma data de início e uma data de devolução válidas.');
      return;
    }

    if (start.getTime() > end.getTime()) {
      toastError('Datas inválidas', 'A data de devolução não pode ser anterior à data de início.');
      return;
    }
    if (amount <= 0) {
      toastError('Valor inválido', 'O valor do período deve ser maior que zero.');
      return;
    }
    setCurrentStep(3);
  };

  const goToStep4 = () => {
    if (initialMileage < 0) {
      toastError('KM inválido', 'O KM inicial não pode ser negativo.');
      return;
    }
    setCurrentStep(4);
  };

  const handleSubmitRental = async () => {
    const start = parseDateOnly(startDate);
    const end = parseDateOnly(endDate);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start.getTime() > end.getTime()
    ) {
      toastError('Datas inválidas', 'Confira as datas de início e devolução antes de emitir o contrato.');
      return;
    }

    setIsSaving(true);
    try {
      const damagesArray = preExistingDamages
        ? preExistingDamages
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const res = await api.rentals.create({
        clientId: selectedClientId,
        vehicleId: selectedVehicleId,
        startDate: dateOnlyToIso(startDate),
        endDate: dateOnlyToIso(endDate),
        billingFrequency,
        amount,
        quantidadePeriodos: quantityPeriods,
        dueDay,
        depositAmount,
        caucaoRecebida,
        statusCaucao,
        mileageAllowance,
        excessMileageRate,
        initialMileage,
        initialFuelLevel,
        desconto: discount,
        acrescimos: addition,
        notes: contractNotes,
        itensChecklistSaida: checklistItems,
        avariasSaida: damagesArray,
      });

      if (res.cnhAlert) {
        toastWarning('Aviso de CNH', res.cnhAlert);
      } else {
        toastSuccess('Locação ativada com sucesso!', 'Contrato emitido e parcelas geradas.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toastError('Erro ao criar locação', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nova Locação de Veículo (Assistente)"
      description="Preencha as 4 etapas para formalizar o contrato de locação e disponibilizar o veículo."
      maxWidth="4xl"
    >
      <div className="space-y-5">
        {/* Stepper Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs">
          {[
            { step: 1, label: '1. Cliente & Veículo', icon: User },
            { step: 2, label: '2. Prazos & Valores', icon: Calendar },
            { step: 3, label: '3. Vistoria de Saída', icon: ClipboardCheck },
            { step: 4, label: '4. Resumo & Confirmação', icon: FileText },
          ].map((item) => {
            const Icon = item.icon;
            const isDone = currentStep > item.step;
            const isCurrent = currentStep === item.step;
            return (
              <div
                key={item.step}
                className={`flex items-center gap-1.5 font-bold transition-colors ${
                  isCurrent
                    ? 'text-emerald-700'
                    : isDone
                    ? 'text-slate-800'
                    : 'text-slate-400'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                    isCurrent
                      ? 'bg-emerald-600 text-white'
                      : isDone
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isDone ? '✓' : item.step}
                </div>
                <span className="hidden sm:inline">{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* STEP 1: CLIENTE E VEÍCULO */}
        {currentStep === 1 && (
          <div className="space-y-4 text-xs animate-in fade-in">
            {/* Cliente */}
            <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-600" />
                  Passo 1.1: Selecione o Motorista / Cliente Ativo
                </span>
                {selectedClient && (
                  <Badge variant={selectedClient.active ? 'ACTIVE' : 'BLOCKED'}>
                    {selectedClient.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                )}
              </div>

              {clients.length === 0 ? (
                <div className="p-3 bg-rose-50 text-rose-800 rounded-lg">
                  Nenhum cliente ativo cadastrado. Cadastre um cliente antes de abrir a locação.
                </div>
              ) : (
                <Select
                  value={selectedClientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  required
                >
                  <option value="">-- Selecione o Cliente da Lista --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} | CPF/CNPJ: {maskCPFOrCNPJ(c.cpfCnpj)} | Tel: {c.phone}
                    </option>
                  ))}
                </Select>
              )}

              {cnhExpiredError && (
                <div className="p-3 bg-rose-50 text-rose-900 border border-rose-200 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{cnhExpiredError}</span>
                </div>
              )}
            </div>

            {/* Veículo */}
            <div className="p-4 bg-slate-50/90 rounded-xl border border-slate-200 space-y-3">
              <span className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                <Car className="w-4 h-4 text-blue-600" />
                Passo 1.2: Selecione o Veículo Disponível na Frota
              </span>

              {availableVehicles.length === 0 ? (
                <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg">
                  Atenção: Nenhum veículo com status <strong>DISPONÍVEL</strong> no momento. Libere um veículo ou cadastre novo na aba Veículos.
                </div>
              ) : (
                <Select
                  value={selectedVehicleId}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  required
                >
                  <option value="">-- Selecione o Veículo Disponível --</option>
                  {availableVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      [{maskPlate(v.plate)}] {v.brand} {v.model} ({v.category}) — Odômetro: {maskMileage(v.currentMileage)}
                    </option>
                  ))}
                </Select>
              )}

              {selectedVehicle && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-white rounded-lg border border-slate-200 mt-2">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Odômetro Atual</span>
                    <div className="font-bold text-slate-800">{maskMileage(selectedVehicle.currentMileage)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Semanal Sugerido</span>
                    <div className="font-bold text-slate-800">{maskCurrency(selectedVehicle.weeklyRate)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Mensal Sugerido</span>
                    <div className="font-bold text-slate-800">{maskCurrency(selectedVehicle.monthlyRate)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Franquia KM</span>
                    <div className="font-bold text-slate-800">{selectedVehicle.mileageAllowance || 1000} KM</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                variant="primary"
                onClick={goToStep2}
                disabled={!selectedClientId || !selectedVehicleId}
                className="gap-1 font-bold"
              >
                Próximo: Prazos e Valores
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: PRAZOS E VALORES */}
        {currentStep === 2 && (
          <div className="space-y-4 text-xs animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="DATA DE INÍCIO DA LOCAÇÃO"
                type="date"
                value={startDate}
                autoUppercase={false}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              <Input
                label="DATA PREVISTA DE DEVOLUÇÃO"
                type="date"
                value={endDate}
                autoUppercase={false}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Ciclo de Cobrança e Valores
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select
                  label="TIPO DE COBRANÇA"
                  value={billingFrequency}
                  onChange={(e) => handleFrequencyChange(e.target.value as BillingFrequency)}
                  required
                >
                  <option value="SEMANAL">SEMANAL (Padrão Motoristas de App)</option>
                  <option value="QUINZENAL">QUINZENAL</option>
                  <option value="MENSAL">MENSAL (Contratos Corporativos/Longos)</option>
                  <option value="DIARIA">DIÁRIA</option>
                </Select>

                <Input
                  label="VALOR DO PERÍODO (R$)"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  required
                />

                <Input
                  label="QUANTIDADE DE PERÍODOS"
                  type="number"
                  min={1}
                  value={quantityPeriods}
                  onChange={(e) => setQuantityPeriods(parseInt(e.target.value) || 1)}
                  helperText="Ex: 4 semanas ou 1 mês"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <Input
                  label="DIA DO VENCIMENTO"
                  type="number"
                  min={1}
                  max={31}
                  value={dueDay}
                  onChange={(e) => setDueDay(parseInt(e.target.value) || 5)}
                  helperText="Dia fixo de vencimento no mês"
                />

                <Input
                  label="VALOR DO CAUÇÃO (R$)"
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                  helperText="Garantia de retenção contratual"
                />

                <Select
                  label="STATUS INICIAL DO CAUÇÃO"
                  value={statusCaucao}
                  onChange={(e) => {
                    const st = e.target.value as DepositStatus;
                    setStatusCaucao(st);
                    if (st === 'RECEBIDA') setCaucaoRecebida(depositAmount);
                    else if (st === 'PENDENTE') setCaucaoRecebida(0);
                  }}
                >
                  <option value="RECEBIDA">RECEBIDA (Pago no ato da retirada)</option>
                  <option value="PENDENTE">PENDENTE (A receber depois)</option>
                  <option value="PARCIAL">PARCIAL</option>
                </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <Input
                  label="FRANQUIA DE KM"
                  type="number"
                  value={mileageAllowance}
                  onChange={(e) => setMileageAllowance(parseInt(e.target.value) || 0)}
                />
                <Input
                  label="TAXA POR KM EXCEDENTE (R$)"
                  type="number"
                  step="0.01"
                  value={excessMileageRate}
                  onChange={(e) => setExcessMileageRate(parseFloat(e.target.value) || 0)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="DESCONTO (R$)"
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  />
                  <Input
                    label="ACRÉSCIMO (R$)"
                    type="number"
                    value={addition}
                    onChange={(e) => setAddition(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-emerald-800 uppercase font-bold">Total Previsto das Parcelas</div>
                  <div className="font-mono text-base font-black text-emerald-900">
                    {maskCurrency(totalPredictedValue)}
                  </div>
                </div>
                <div className="text-right text-emerald-800 text-[11px]">
                  {quantityPeriods} parcela(s) de {maskCurrency(amount)}
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setCurrentStep(1)} className="gap-1">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <Button variant="primary" onClick={goToStep3} className="gap-1 font-bold">
                Próximo: Vistoria de Saída
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: VISTORIA DE SAÍDA */}
        {currentStep === 3 && (
          <div className="space-y-4 text-xs animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="QUILOMETRAGEM DE SAÍDA (KM)"
                type="number"
                value={initialMileage}
                onChange={(e) => setInitialMileage(parseInt(e.target.value) || 0)}
                required
                helperText="Odômetro verificado na presença do cliente"
              />
              <Select
                label="NÍVEL DE COMBUSTÍVEL NA ENTREGA"
                value={initialFuelLevel}
                onChange={(e) => setInitialFuelLevel(e.target.value)}
              >
                <option value="CHEIO (1/1)">CHEIO (1/1)</option>
                <option value="3/4">3/4 DO TANQUE</option>
                <option value="1/2">1/2 (MEIO TANQUE)</option>
                <option value="1/4">1/4 DO TANQUE</option>
                <option value="RESERVA">RESERVA</option>
              </Select>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <span className="font-bold text-slate-900 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                Checklist Obrigatório de Entrega
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {checklistItems.map((item, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => toggleChecklistItem(idx)}
                    className={`p-2.5 rounded-lg border text-left flex items-center justify-between transition-colors ${
                      item.ok
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 font-medium'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <span>{item.item}</span>
                    <span className="font-bold text-[11px]">{item.ok ? 'OK ✓' : 'AVARIA / FALTA ✗'}</span>
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="AVARIAS PRÉ-EXISTENTES (SEPARADAS POR VÍRGULA)"
              placeholder="Ex: Pequeno risco no para-choque traseiro, detalhe na calota direita..."
              value={preExistingDamages}
              onChange={(e) => setPreExistingDamages(e.target.value)}
            />

            <Input
              label="OBSERVAÇÕES DO CONTRATO"
              placeholder="Ex: Veículo entregue com manual e cópia do seguro."
              value={contractNotes}
              onChange={(e) => setContractNotes(e.target.value)}
            />

            <div className="flex justify-between pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setCurrentStep(2)} className="gap-1">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <Button variant="primary" onClick={goToStep4} className="gap-1 font-bold">
                Próximo: Revisão & Confirmação
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: RESUMO & CONFIRMAÇÃO */}
        {currentStep === 4 && (
          <div className="space-y-4 text-xs animate-in fade-in">
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Resumo da Contratação</div>
                  <div className="text-base font-black text-emerald-400 mt-0.5">
                    {selectedClient?.name}
                  </div>
                </div>
                <span className="font-mono bg-white text-slate-900 font-bold px-2 py-1 rounded text-xs">
                  {selectedVehicle?.plate} — {selectedVehicle?.brand} {selectedVehicle?.model}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300 pt-2 border-t border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-500 uppercase text-[9px] block">Período</span>
                  <strong className="text-white">{formatDate(startDate)} até {formatDate(endDate)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 uppercase text-[9px] block">Frequência</span>
                  <strong className="text-emerald-400">{billingFrequency} ({quantityPeriods}x)</strong>
                </div>
                <div>
                  <span className="text-slate-500 uppercase text-[9px] block">Total Previsto</span>
                  <strong className="text-white">{maskCurrency(totalPredictedValue)}</strong>
                </div>
                <div>
                  <span className="text-slate-500 uppercase text-[9px] block">Caução</span>
                  <strong className="text-amber-300">{maskCurrency(depositAmount)} ({statusCaucao})</strong>
                </div>
              </div>
            </div>

            {/* Preview of Installments */}
            <div className="space-y-2">
              <div className="font-bold text-slate-800 uppercase text-[11px] tracking-wider flex items-center justify-between">
                <span>Cronograma de Parcelas Geradas Automaticamente</span>
                <span className="text-slate-500 font-normal">{previewInstallments.length} parcelas</span>
              </div>

              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase sticky top-0">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Descrição</th>
                      <th className="px-3 py-2">Vencimento Previsto</th>
                      <th className="px-3 py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {previewInstallments.map((inst) => (
                      <tr key={inst.numero} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-bold text-slate-700">#{inst.numero}</td>
                        <td className="px-3 py-2 text-slate-600">{inst.descricao}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900">{formatDate(inst.vencimento)}</td>
                        <td className="px-3 py-2 text-right font-bold text-slate-900">{maskCurrency(inst.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between pt-3 border-t border-slate-100">
              <Button variant="outline" onClick={() => setCurrentStep(3)} className="gap-1">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitRental}
                isLoading={isSaving}
                className="gap-1 font-bold bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="w-4 h-4" />
                Emitir Contrato & Ativar Locação
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

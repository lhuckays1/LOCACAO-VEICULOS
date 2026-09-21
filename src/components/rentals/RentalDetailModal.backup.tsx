import React, { useState } from 'react';
import { Rental, RentalPayment, DepositStatus } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
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
  FileText,
  CreditCard,
  ClipboardCheck,
  History,
  CheckCircle2,
  AlertTriangle,
  Car,
  User,
  ShieldCheck,
  Calendar,
  DollarSign,
  Fuel,
  Gauge,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface RentalDetailModalProps {
  rental: Rental | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onOpenReturnModal: (rental: Rental) => void;
  onOpenCancelModal: (rental: Rental) => void;
}

export const RentalDetailModal: React.FC<RentalDetailModalProps> = ({
  rental,
  isOpen,
  onClose,
  onRefresh,
  onOpenReturnModal,
  onOpenCancelModal,
}) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<'resumo' | 'cobrancas' | 'vistorias' | 'historico'>('resumo');

  // Pay Installment state
  const [payingPayment, setPayingPayment] = useState<RentalPayment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [isSubmittingPay, setIsSubmittingPay] = useState(false);

  // Update Caução state
  const [isUpdatingCaucao, setIsUpdatingCaucao] = useState(false);
  const [caucaoStatus, setCaucaoStatus] = useState<DepositStatus>(rental?.statusCaucao || 'PENDENTE');
  const [caucaoReceivedAmount, setCaucaoReceivedAmount] = useState<number>(rental?.caucaoRecebida || 0);
  const [caucaoNotes, setCaucaoNotes] = useState('');
  const [isSubmittingCaucao, setIsSubmittingCaucao] = useState(false);

  if (!rental) return null;

  const handleOpenPayModal = (payment: RentalPayment) => {
    setPayingPayment(payment);
    setPaymentMethod('PIX');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentNotes('');

    const paymentWithBalance = payment as RentalPayment & { saldo?: number };
    setPaymentAmount(Number(paymentWithBalance.saldo ?? payment.valor) || 0);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPayment) return;

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      toastError('Valor inválido', 'Informe um valor de pagamento maior que zero.');
      return;
    }

    setIsSubmittingPay(true);
    try {
      const response = await api.rentals.payPayment(rental.id, payingPayment.id, {
        formaPagamento: paymentMethod,
        dataPagamento: paymentDate,
        observacoes: paymentNotes,
        valorPago: amount,
      });

      const updatedPayment = response?.data;

      toastSuccess(
        'Pagamento registrado!',
        updatedPayment?.status === 'PARCIAL'
          ? `Parcela #${payingPayment.numeroParcela} recebeu ${maskCurrency(amount)}. O saldo restante foi atualizado.`
          : `Parcela #${payingPayment.numeroParcela} marcada como PAGA.`
      );

      setPayingPayment(null);
      onRefresh();
    } catch (err: any) {
      toastError('Erro ao registrar pagamento', err.message);
    } finally {
      setIsSubmittingPay(false);
    }
  };

  const handleOpenCaucaoModal = () => {
    setCaucaoStatus(rental.statusCaucao || (rental.caucaoRecebida >= rental.valorCaucao ? 'RECEBIDA' : 'PENDENTE'));
    setCaucaoReceivedAmount(rental.caucaoRecebida || 0);
    setCaucaoNotes('');
    setIsUpdatingCaucao(true);
  };

  const handleSaveCaucao = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCaucao(true);
    try {
      await api.rentals.updateCaucao(rental.id, {
        statusCaucao: caucaoStatus,
        caucaoRecebida: caucaoReceivedAmount,
        observacoes: caucaoNotes,
      });

      toastSuccess('Caução atualizada!', 'Status e valor recebido foram atualizados com sucesso.');
      setIsUpdatingCaucao(false);
      onRefresh();
    } catch (err: any) {
      toastError('Erro ao atualizar caução', err.message);
    } finally {
      setIsSubmittingCaucao(false);
    }
  };

  const contractCode = rental.codigoContrato || rental.rentalNumber;
  const isCancelable = rental.status === 'RASCUNHO' || rental.status === 'AGENDADA' || rental.status === 'DRAFT' || rental.status === 'SCHEDULED';
  const isActive = rental.status === 'ATIVA' || rental.status === 'ACTIVE';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Contrato de Locação ${contractCode}`}
        description="Acompanhamento detalhado do contrato, cobranças, vistorias e status do veículo."
        maxWidth="4xl"
      >
        <div className="space-y-5">
          {/* Header Summary Strip */}
          <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-wide text-emerald-400 font-mono">
                  {contractCode}
                </span>
                <Badge variant={rental.status}>{rental.status}</Badge>
              </div>
              <div className="text-xs text-slate-300 mt-1">
                Cliente: <strong className="text-white">{rental.client?.name || 'Cliente'}</strong> |
                Veículo: <strong className="text-white">{rental.vehicle?.brand} {rental.vehicle?.model}</strong> (
                <span className="font-mono text-emerald-300">{rental.vehicle?.plate}</span>)
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {isActive && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onOpenReturnModal(rental);
                  }}
                  className="font-bold text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Car className="w-3.5 h-3.5" />
                  Devolução do Veículo
                </Button>
              )}
              {isCancelable && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onOpenCancelModal(rental);
                  }}
                  className="font-bold text-xs"
                >
                  Cancelar Locação
                </Button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 text-xs font-semibold text-slate-600 gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('resumo')}
              className={`pb-2.5 px-3 flex items-center gap-1.5 transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'resumo'
                  ? 'border-emerald-600 text-emerald-700 font-bold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              1. Resumo do Contrato
            </button>
            <button
              onClick={() => setActiveTab('cobrancas')}
              className={`pb-2.5 px-3 flex items-center gap-1.5 transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'cobrancas'
                  ? 'border-emerald-600 text-emerald-700 font-bold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              2. Cobranças & Parcelas ({rental.payments?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('vistorias')}
              className={`pb-2.5 px-3 flex items-center gap-1.5 transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'vistorias'
                  ? 'border-emerald-600 text-emerald-700 font-bold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              3. Vistorias ({rental.inspections?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('historico')}
              className={`pb-2.5 px-3 flex items-center gap-1.5 transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'historico'
                  ? 'border-emerald-600 text-emerald-700 font-bold'
                  : 'border-transparent hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              4. Histórico
            </button>
          </div>

          {/* TAB 1: RESUMO */}
          {activeTab === 'resumo' && (
            <div className="space-y-4 text-xs">
              {/* Grid 1: Cliente & Veículo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cliente */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 uppercase text-[11px] tracking-wider">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    Condutor / Cliente
                  </div>
                  {rental.client ? (
                    <div className="space-y-1 text-slate-600">
                      <div className="font-bold text-slate-900 text-sm">{rental.client.name}</div>
                      <div>CPF/CNPJ: <span className="font-mono font-medium">{maskCPFOrCNPJ(rental.client.cpfCnpj)}</span></div>
                      <div>Telefone: <span className="font-medium">{maskPhone(rental.client.phone)}</span></div>
                      <div>E-mail: <span className="font-medium">{rental.client.email || 'Não informado'}</span></div>
                      {rental.client.driverLicenseNumber && (
                        <div>
                          CNH: <span className="font-mono font-medium">{rental.client.driverLicenseNumber}</span>
                          {rental.client.driverLicenseExpiration && (
                            <span className="text-[10px] text-slate-500 ml-1">
                              (Validade: {formatDate(rental.client.driverLicenseExpiration)})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">Cliente não encontrado</p>
                  )}
                </div>

                {/* Veículo */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 uppercase text-[11px] tracking-wider">
                      <Car className="w-3.5 h-3.5 text-blue-600" />
                      Veículo Locado
                    </div>
                    {rental.vehicle && (
                      <span className="font-mono font-bold bg-slate-900 text-white px-2 py-0.5 rounded text-[11px]">
                        {maskPlate(rental.vehicle.plate)}
                      </span>
                    )}
                  </div>
                  {rental.vehicle ? (
                    <div className="space-y-1 text-slate-600">
                      <div className="font-bold text-slate-900 text-sm">
                        {rental.vehicle.brand} {rental.vehicle.model}
                      </div>
                      <div>Categoria: <span className="font-medium">{rental.vehicle.category}</span></div>
                      <div>KM na Saída: <strong className="text-slate-900">{maskMileage(rental.kmInicial ?? rental.initialMileage)}</strong></div>
                      {rental.kmFinal ? (
                        <div>KM no Retorno: <strong className="text-emerald-700">{maskMileage(rental.kmFinal)}</strong></div>
                      ) : (
                        <div>KM Atual Odômetro: <span className="font-medium">{maskMileage(rental.vehicle.currentMileage)}</span></div>
                      )}
                      <div>Combustível de Saída: <span className="font-medium">{rental.initialFuelLevel || '1/1 (CHEIO)'}</span></div>
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">Veículo não vinculado</p>
                  )}
                </div>
              </div>

              {/* Grid 2: Vigência e Caução */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vigência & Frequência */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 uppercase text-[11px] tracking-wider">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    Prazos e Recorrência
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Início da Locação</div>
                      <div className="font-bold text-slate-900">{formatDate(rental.dataInicio || rental.startDate)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Previsão Devolução</div>
                      <div className="font-bold text-slate-900">{formatDate(rental.dataFimPrevista || rental.endDate)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Frequência de Cobrança</div>
                      <div className="font-bold text-emerald-800">{rental.tipoCobranca || rental.billingFrequency}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Dia do Vencimento</div>
                      <div className="font-bold text-slate-900">Todo dia {rental.diaVencimento || rental.dueDay || 5}</div>
                    </div>
                  </div>
                  {rental.dataFimReal && (
                    <div className="p-2 bg-emerald-50 rounded text-emerald-800 font-bold text-[11px]">
                      Devolução Realizada em: {formatDate(rental.dataFimReal)}
                    </div>
                  )}
                </div>

                {/* Caução de Garantia */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 uppercase text-[11px] tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                      Garantia / Caução
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenCaucaoModal}
                      className="text-[10px] py-0.5 px-2 h-auto"
                    >
                      Atualizar Caução
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Valor do Caução</div>
                      <div className="font-bold text-slate-900 text-sm">
                        {maskCurrency(rental.valorCaucao ?? rental.depositAmount)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Caução Recebida</div>
                      <div className="font-bold text-emerald-700 text-sm">
                        {maskCurrency(rental.caucaoRecebida ?? 0)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-slate-500 text-[11px]">Status da Garantia:</span>
                    <Badge variant={rental.statusCaucao || 'PENDENTE'}>
                      {rental.statusCaucao || 'PENDENTE'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Grid 3: Totais Financeiros */}
              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
                <div className="font-bold text-emerald-950 uppercase text-[11px] tracking-wider flex items-center gap-1.5 mb-3">
                  <DollarSign className="w-4 h-4 text-emerald-700" />
                  Balanço Financeiro da Locação
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Valor do Período</span>
                    <div className="font-black text-slate-900 text-sm mt-0.5">
                      {maskCurrency(rental.valorPeriodo ?? rental.amount)}
                    </div>
                    <span className="text-[10px] text-slate-400">{rental.quantidadePeriodos || 1} período(s)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Previsto</span>
                    <div className="font-black text-slate-900 text-sm mt-0.5">
                      {maskCurrency(rental.valorTotalPrevisto ?? (rental.valorPeriodo ?? rental.amount) * (rental.quantidadePeriodos || 1))}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Já Pago</span>
                    <div className="font-black text-emerald-700 text-sm mt-0.5">
                      {maskCurrency(rental.financialSummary?.totalPaid || 0)}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Pendente</span>
                    <div className="font-black text-amber-700 text-sm mt-0.5">
                      {maskCurrency(rental.financialSummary?.totalPending || 0)}
                    </div>
                  </div>
                </div>
              </div>

              {rental.observacoes && (
                <div className="p-3 bg-slate-50 rounded-lg text-slate-600 border border-slate-200 text-xs">
                  <strong className="text-slate-800">Observações:</strong> {rental.observacoes}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COBRANÇAS / PARCELAS */}
          {activeTab === 'cobrancas' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <p className="text-slate-500">
                  Cobranças geradas automaticamente com base no ciclo ({rental.tipoCobranca || rental.billingFrequency}).
                </p>
                <div className="text-slate-700 font-medium">
                  {rental.payments?.filter((p) => p.status === 'PAGO').length || 0} de {rental.payments?.length || 0} pagas
                </div>
              </div>

              {!rental.payments || rental.payments.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
                  <CreditCard className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  Nenhuma parcela cadastrada para este contrato.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-bold text-[10px]">
                      <tr>
                        <th className="px-3.5 py-3">Parcela</th>
                        <th className="px-3.5 py-3">Descrição</th>
                        <th className="px-3.5 py-3">Vencimento</th>
                        <th className="px-3.5 py-3">Valor</th>
                        <th className="px-3.5 py-3">Status</th>
                        <th className="px-3.5 py-3">Pagamento</th>
                        <th className="px-3.5 py-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {rental.payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-slate-50/80">
                          <td className="px-3.5 py-3 font-bold text-slate-800">
                            #{payment.numeroParcela}
                          </td>
                          <td className="px-3.5 py-3 text-slate-600">{payment.descricao}</td>
                          <td className="px-3.5 py-3">
                            <span className="font-semibold text-slate-900">
                              {formatDate(payment.dataVencimento)}
                            </span>
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="font-bold text-slate-900">
                              {maskCurrency(payment.valor)}
                            </div>
                            {payment.status === 'PARCIAL' && payment.saldo !== undefined && (
                              <div className="text-[10px] text-amber-700 mt-0.5">
                                Saldo: {maskCurrency(payment.saldo)}
                              </div>
                            )}
                          </td>
                          <td className="px-3.5 py-3">
                            <Badge variant={payment.status}>{payment.status}</Badge>
                          </td>
                          <td className="px-3.5 py-3 text-[11px] text-slate-500">
                            {payment.status === 'PAGO' ? (
                              <div>
                                <span className="font-semibold text-emerald-700">
                                  {formatDate(payment.dataPagamento || '')}
                                </span>
                                {payment.formaPagamento && (
                                  <div className="text-[10px] text-slate-400">Via {payment.formaPagamento}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">Aguardando</span>
                            )}
                          </td>
                          <td className="px-3.5 py-3 text-right">
                            {payment.status !== 'PAGO' && payment.status !== 'CANCELADO' && (
                              <Button
                                size="sm"
                                variant="primary"
                                onClick={() => handleOpenPayModal(payment)}
                                className="text-[11px] py-1 px-2.5 h-auto font-bold gap-1 bg-emerald-600 hover:bg-emerald-700"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Dar Baixa
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: VISTORIAS */}
          {activeTab === 'vistorias' && (
            <div className="space-y-4 text-xs">
              {!rental.inspections || rental.inspections.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  <ClipboardCheck className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  Nenhuma vistoria registrada para esta locação.
                </div>
              ) : (
                rental.inspections.map((insp) => (
                  <div key={insp.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={insp.tipo === 'SAIDA' ? 'info' : 'success'}>
                          {insp.tipo === 'SAIDA' ? 'VISTORIA DE SAÍDA' : 'VISTORIA DE RETORNO'}
                        </Badge>
                        <span className="font-semibold text-slate-700">
                          {formatDate(insp.dataVistoria)}
                        </span>
                      </div>
                      <Badge variant={insp.statusAprovacao}>{insp.statusAprovacao}</Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Odômetro / KM</span>
                        <div className="font-bold text-slate-900">{maskMileage(insp.km)}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Nível Combustível</span>
                        <div className="font-bold text-slate-900">{insp.nivelCombustivel}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Vistoriador</span>
                        <div className="font-medium text-slate-900">{insp.responsavelNome}</div>
                      </div>
                    </div>

                    {/* Checklist */}
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-500 mb-1.5">
                        Itens do Checklist
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {insp.itensChecklist?.map((item, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded border flex items-center gap-1.5 text-[11px] ${
                              item.ok
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                                : 'bg-rose-50 border-rose-200 text-rose-900 font-semibold'
                            }`}
                          >
                            {item.ok ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            )}
                            <span className="truncate">{item.item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {insp.avariasIdentificadas && insp.avariasIdentificadas.length > 0 && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-900">
                        <strong className="text-[11px] uppercase block mb-1">Avarias Identificadas:</strong>
                        <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                          {insp.avariasIdentificadas.map((av, i) => (
                            <li key={i}>{av}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: HISTÓRICO */}
          {activeTab === 'historico' && (
            <div className="space-y-3 text-xs">
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                <div className="relative">
                  <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-emerald-600 border-2 border-white shadow-xs"></span>
                  <div className="font-bold text-slate-800">Criação do Contrato</div>
                  <div className="text-[10px] text-slate-400">{formatDate(rental.createdAt)}</div>
                  <p className="text-slate-600 mt-0.5">
                    Contrato {contractCode} registrado no sistema para o cliente {rental.client?.name}.
                  </p>
                </div>

                <div className="relative">
                  <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-xs"></span>
                  <div className="font-bold text-slate-800">Início da Locação / Entrega do Veículo</div>
                  <div className="text-[10px] text-slate-400">{formatDate(rental.dataInicio || rental.startDate)}</div>
                  <p className="text-slate-600 mt-0.5">
                    Veículo liberado com odômetro em {maskMileage(rental.kmInicial ?? rental.initialMileage)}. Status atualizado para ALUGADO.
                  </p>
                </div>

                {rental.dataFimReal && (
                  <div className="relative">
                    <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-purple-600 border-2 border-white shadow-xs"></span>
                    <div className="font-bold text-slate-800">Devolução do Veículo</div>
                    <div className="text-[10px] text-slate-400">{formatDate(rental.dataFimReal)}</div>
                    <p className="text-slate-600 mt-0.5">
                      Veículo recebido de volta com {maskMileage(rental.kmFinal || 0)}. Veículo liberado para DISPONÍVEL.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Close */}
          <div className="flex items-center justify-end pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={onClose} size="sm">
              Fechar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Pay Installment Modal */}
      {payingPayment && (
        <Modal
          isOpen={!!payingPayment}
          onClose={() => setPayingPayment(null)}
          title={`Dar Baixa na Parcela #${payingPayment.numeroParcela}`}
          description={`Valor original: ${maskCurrency(payingPayment.valor)} | Vencimento: ${formatDate(payingPayment.dataVencimento)}`}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmPayment} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-500">Valor da Parcela</div>
                <div className="text-sm font-black text-slate-900 mt-0.5">
                  {maskCurrency(payingPayment.valor)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="text-[10px] uppercase font-bold text-amber-700">Saldo Atual</div>
                <div className="text-sm font-black text-amber-800 mt-0.5">
                  {maskCurrency(Number(payingPayment.saldo ?? payingPayment.valor) || 0)}
                </div>
              </div>
            </div>

            <Input
              label="VALOR A RECEBER (R$)"
              type="number"
              min="0.01"
              step="0.01"
              value={paymentAmount || ''}
              onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
              required
            />

            <div className="flex items-center justify-between text-[10px] text-slate-500 -mt-1">
              <span>Informe o valor efetivamente recebido.</span>
              <button
                type="button"
                className="font-bold text-emerald-700 hover:text-emerald-800"
                onClick={() => setPaymentAmount(Number(payingPayment.saldo ?? payingPayment.valor) || 0)}
              >
                Preencher saldo total
              </button>
            </div>

            <Select
              label="FORMA DE PAGAMENTO"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              required
            >
              <option value="PIX">PIX (Instantâneo)</option>
              <option value="BOLETO">Boleto Bancário</option>
              <option value="CARTAO_CREDITO">Cartão de Crédito</option>
              <option value="CARTAO_DEBITO">Cartão de Débito</option>
              <option value="DINHEIRO">Dinheiro em Espécie</option>
              <option value="TRANSFERENCIA">Transferência / TED</option>
            </Select>

            <Input
              label="DATA DO PAGAMENTO"
              type="date"
              value={paymentDate}
              autoUppercase={false}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />

            <Input
              label="OBSERVAÇÕES DO PAGAMENTO"
              placeholder="Ex: Comprovante enviado via WhatsApp, desconto concedido, etc."
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setPayingPayment(null)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmittingPay}
                className="font-bold bg-emerald-600 hover:bg-emerald-700"
              >
                Confirmar Recebimento
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Update Caução Modal */}
      {isUpdatingCaucao && (
        <Modal
          isOpen={isUpdatingCaucao}
          onClose={() => setIsUpdatingCaucao(false)}
          title="Atualizar Garantia / Caução"
          description={`Valor contratual: ${maskCurrency(rental.valorCaucao ?? rental.depositAmount)}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveCaucao} className="space-y-3 text-xs">
            <Select
              label="STATUS DO CAUÇÃO"
              value={caucaoStatus}
              onChange={(e) => setCaucaoStatus(e.target.value as DepositStatus)}
              required
            >
              <option value="PENDENTE">PENDENTE (Ainda não recebido)</option>
              <option value="RECEBIDA">RECEBIDA (Valor integral pago)</option>
              <option value="PARCIAL">PARCIAL (Recebido parcialmente)</option>
              <option value="DEVOLVIDA">DEVOLVIDA (Estornado ao cliente no término)</option>
            </Select>

            <Input
              label="VALOR RECEBIDO ATUALMENTE (R$)"
              type="number"
              value={caucaoReceivedAmount}
              onChange={(e) => setCaucaoReceivedAmount(parseFloat(e.target.value) || 0)}
              required
            />

            <Input
              label="OBSERVAÇÕES DO CAUÇÃO"
              placeholder="Ex: Pago via PIX no ato da retirada, ou retido por avaria."
              value={caucaoNotes}
              onChange={(e) => setCaucaoNotes(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsUpdatingCaucao(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmittingCaucao}
                className="font-bold"
              >
                Salvar Caução
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { maskCurrency, formatDate } from '../../utils/formatters';
import { api } from '../../services/api';
import { useToast } from '../ui/Toast';
import {
  FileText,
  Calendar,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  User,
  Car,
  Tag,
  Layers,
  XCircle,
  ExternalLink,
} from 'lucide-react';

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string | null;
  onOpenSettlement?: (tx: any) => void;
  onRefresh?: () => void;
}

export const TransactionDetailsModal: React.FC<TransactionDetailsModalProps> = ({
  isOpen,
  onClose,
  transactionId,
  onOpenSettlement,
  onRefresh,
}) => {
  const { addToast } = useToast();
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (isOpen && transactionId) {
      setIsLoading(true);
      api.financial
        .getTransactionById(transactionId)
        .then((res) => {
          setData(res.data);
        })
        .catch((err) => {
          console.error(err);
          addToast({ title: 'ERRO', message: 'Falha ao carregar detalhes.', type: 'danger' });
          onClose();
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, transactionId]);

  if (!isOpen || !transactionId) return null;

  const handleCancel = async () => {
    if (!window.confirm('TEM CERTEZA QUE DESEJA CANCELAR ESTE LANÇAMENTO FINANCEIRO?')) {
      return;
    }

    const reason = window.prompt('MOTIVO DO CANCELAMENTO:');
    if (!reason) return;

    try {
      setIsCancelling(true);
      await api.financial.cancelTransaction(transactionId, reason);
      addToast({
        title: 'LANÇAMENTO CANCELADO',
        message: 'Lançamento cancelado com sucesso.',
        type: 'success',
      });
      if (onRefresh) onRefresh();
      onClose();
    } catch (err: any) {
      addToast({
        title: 'ERRO',
        message: err.message || 'Falha ao cancelar lançamento.',
        type: 'danger',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="DETALHES DO LANÇAMENTO FINANCEIRO"
      description="Histórico completo de conciliação, baixas e vínculo contratual."
      maxWidth="3xl"
    >
      {isLoading || !data ? (
        <div className="py-12 text-center text-slate-400">Carregando detalhes...</div>
      ) : (
        <div className="space-y-4">
          {/* Header Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {data.type === 'INCOME' ? 'RECEITA' : 'DESPESA'} • {data.origin}
                </span>
                <h2 className="text-base font-black text-slate-900 mt-0.5">{data.description}</h2>
              </div>
              <Badge variant={data.status}>{data.status}</Badge>
            </div>

            {/* Financial Amounts Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Valor Bruto</span>
                <span className="text-sm font-bold text-slate-800 font-mono">
                  {maskCurrency(data.grossAmount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Líquido Final</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {maskCurrency(data.netAmount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-600 block uppercase font-bold">Total Pago</span>
                <span className="text-sm font-black text-emerald-600 font-mono">
                  {maskCurrency(data.paidAmount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-rose-600 block uppercase font-bold">Saldo Restante</span>
                <span className="text-sm font-black text-rose-600 font-mono">
                  {maskCurrency(data.remainingAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Related Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2">
              <h4 className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                Classificação Contábil
              </h4>
              <div className="space-y-1.5 text-slate-600">
                <div className="flex justify-between">
                  <span>Categoria:</span>
                  <strong className="text-slate-800">{data.categoryName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Centro de Custo:</span>
                  <strong className="text-slate-800">
                    {data.costCenterCode} - {data.costCenterName}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Vencimento:</span>
                  <strong className="text-slate-800">{formatDate(data.dueDate)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Competência:</span>
                  <strong className="text-slate-800">{formatDate(data.competencyDate)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Forma de Cobrança:</span>
                  <strong className="text-slate-800">{data.paymentMethod}</strong>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2">
              <h4 className="font-bold text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                Vínculos & Operação
              </h4>
              <div className="space-y-1.5 text-slate-600">
                {data.contractNumber && (
                  <div className="flex justify-between">
                    <span>Contrato Locação:</span>
                    <strong className="text-emerald-700 font-mono">{data.contractNumber}</strong>
                  </div>
                )}
                {data.clientName && (
                  <div className="flex justify-between">
                    <span>Cliente:</span>
                    <strong className="text-slate-800">{data.clientName}</strong>
                  </div>
                )}
                {data.vehiclePlate && (
                  <div className="flex justify-between">
                    <span>Veículo:</span>
                    <strong className="text-slate-800 font-mono">
                      {data.vehiclePlate} ({data.vehicleModel})
                    </strong>
                  </div>
                )}
                {data.notes && (
                  <div className="pt-1 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Observações</span>
                    <p className="text-slate-700 mt-0.5">{data.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Settlements History */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Histórico de Baixas & Pagamentos
              </h4>
              <span className="text-[11px] text-slate-500 font-medium">
                {data.settlements?.length || 0} registro(s)
              </span>
            </div>

            {data.settlements && data.settlements.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {data.settlements.map((s: any) => (
                  <div key={s.id} className="p-3 text-xs flex items-center justify-between bg-white hover:bg-slate-50">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{maskCurrency(s.amount)}</span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-mono">
                          {s.paymentMethod}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        Liquidado em {formatDate(s.paymentDate)} • Operador: {s.userName}
                      </div>
                      {s.notes && <p className="text-slate-600 text-[11px] italic mt-0.5">"{s.notes}"</p>}
                    </div>
                    {s.receiptUrl && (
                      <a
                        href={s.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        Comprovante <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-slate-400 bg-white">
                Nenhum pagamento ou baixa registrado até o momento.
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div>
              {data.status !== 'CANCELLED' && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isCancelling}
                  className="text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50 text-xs gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancelar Lançamento
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Fechar
              </Button>
              {data.remainingAmount > 0 && data.status !== 'CANCELLED' && onOpenSettlement && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    onClose();
                    onOpenSettlement(data);
                  }}
                  className="gap-1.5 text-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Liquidar / Dar Baixa
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

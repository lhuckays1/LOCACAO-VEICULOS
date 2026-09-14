import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { maskCurrency, formatDate } from '../../utils/formatters';
import { api } from '../../services/api';
import { useToast } from '../ui/Toast';
import { CheckCircle2, AlertTriangle, Calendar, DollarSign, FileText } from 'lucide-react';

interface SettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any | null;
  onSuccess: () => void;
}

export const SettlementModal: React.FC<SettlementModalProps> = ({
  isOpen,
  onClose,
  transaction,
  onSuccess,
}) => {
  const { addToast } = useToast();
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');
  const [interest, setInterest] = useState<number>(0);
  const [fine, setFine] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (transaction) {
      const today = new Date().toISOString().split('T')[0];
      const remaining = Number(transaction.remainingAmount ?? transaction.netAmount ?? 0);
      setAmount(remaining);
      setPaymentDate(today);
      setPaymentMethod(transaction.paymentMethod || 'PIX');
      setInterest(transaction.suggestedInterest || 0);
      setFine(transaction.suggestedFine || 0);
      setDiscount(0);
      setNotes('');
      setReceiptUrl('');
    }
  }, [transaction]);

  if (!transaction) return null;

  const totalToPay = Math.max(0, Number((amount + interest + fine - discount).toFixed(2)));
  const isIncome = transaction.type === 'INCOME';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      addToast({
        title: 'VALOR INVÁLIDO',
        message: 'O valor do pagamento deve ser superior a zero.',
        type: 'warning',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.financial.settleTransaction(transaction.id, {
        amount: Number(amount),
        paymentDate,
        paymentMethod,
        interest: Number(interest) || 0,
        fine: Number(fine) || 0,
        discount: Number(discount) || 0,
        notes: notes ? notes.toUpperCase() : undefined,
        receiptUrl: receiptUrl || undefined,
      });

      addToast({
        title: 'BAIXA CONFIRMADA COM SUCESSO',
        message: res.message || 'Lançamento liquidado com sucesso.',
        type: 'success',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      addToast({
        title: 'ERRO AO DAR BAIXA',
        message: err.message || 'Não foi possível registrar o pagamento.',
        type: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFullAmount = () => {
    setAmount(Number(transaction.remainingAmount || transaction.netAmount || 0));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isIncome ? 'RECEBER / LIQUIDAR TÍTULO' : 'PAGAR / LIQUIDAR DESPESA'}
      description={`Confirmação de recebimento ou pagamento com conciliação financeira.`}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Transaction Summary Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                {transaction.origin} • {transaction.categoryName || 'GERAL'}
              </span>
              <h3 className="text-sm font-bold text-slate-900 mt-0.5">{transaction.description}</h3>
              {transaction.clientName && (
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  CLIENTE: <span className="font-bold text-slate-800">{transaction.clientName}</span>
                </p>
              )}
              {transaction.vehiclePlate && (
                <p className="text-xs text-slate-600 font-medium">
                  VEÍCULO: <span className="font-mono font-bold text-slate-800">{transaction.vehiclePlate}</span> ({transaction.vehicleModel})
                </p>
              )}
            </div>
            <Badge variant={transaction.status}>{transaction.status}</Badge>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/80 text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block">Vencimento</span>
              <span className="font-bold text-slate-800 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                {formatDate(transaction.dueDate)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Valor Líquido</span>
              <span className="font-bold text-slate-900">{maskCurrency(transaction.netAmount)}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Saldo em Aberto</span>
              <span className="font-black text-rose-600 font-mono">
                {maskCurrency(transaction.remainingAmount)}
              </span>
            </div>
          </div>

          {transaction.daysOverdue > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Título com <strong>{transaction.daysOverdue} dias de atraso</strong>.
              </span>
            </div>
          )}
        </div>

        {/* Payment Form Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">VALOR A LIQUIDAR (R$)</label>
              <button
                type="button"
                onClick={handleFullAmount}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 underline"
              >
                Saldo Total
              </button>
            </div>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={transaction.remainingAmount * 1.5}
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              required
              className="font-mono font-bold text-sm"
            />
            {amount < transaction.remainingAmount && amount > 0 && (
              <span className="text-[10px] text-amber-600 font-bold block mt-1">
                * BAIXA PARCIAL: Restará R$ {(transaction.remainingAmount - amount).toFixed(2)} em aberto.
              </span>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">DATA DO PAGAMENTO</label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">FORMA DE PAGAMENTO</label>
            <Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="PIX">PIX</option>
              <option value="BOLETO">BOLETO BANCÁRIO</option>
              <option value="CARTAO_CREDITO">CARTÃO DE CRÉDITO</option>
              <option value="CARTAO_DEBITO">CARTÃO DE DÉBITO</option>
              <option value="DINHEIRO">DINHEIRO EM ESPÉCIE</option>
              <option value="TRANSFERENCIA">TRANSFERÊNCIA / TED</option>
              <option value="OUTRO">OUTRO MEIO</option>
            </Select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">DESCONTO (R$)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={discount || ''}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              placeholder="0,00"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">JUROS (R$)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={interest || ''}
              onChange={(e) => setInterest(parseFloat(e.target.value) || 0)}
              placeholder="0,00"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">MULTA DE MORA (R$)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={fine || ''}
              onChange={(e) => setFine(parseFloat(e.target.value) || 0)}
              placeholder="0,00"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">OBSERVAÇÕES DO PAGAMENTO</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value.toUpperCase())}
            placeholder="EX: PAGO VIA PIX BANCO ITAÚ, AUTORIZADO PELA DIRETORIA"
            className="uppercase"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">LINK OU COMPROVANTE (OPCIONAL)</label>
          <Input
            value={receiptUrl}
            onChange={(e) => setReceiptUrl(e.target.value)}
            placeholder="HTTPS://..."
          />
        </div>

        {/* Calculated Total Bar */}
        <div className="bg-slate-900 text-white p-3.5 rounded-xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
              TOTAL EFETIVAMENTE {isIncome ? 'RECEBIDO' : 'PAGO'}
            </span>
            <span className="text-xs text-slate-300">
              Principal + Juros + Multa - Desconto
            </span>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-emerald-400 font-mono">
              {maskCurrency(totalToPay)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || amount <= 0}
            className="gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? 'Processando...' : 'Confirmar Liquidação'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

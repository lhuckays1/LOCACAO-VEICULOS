import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { api } from '../../services/api';
import { useToast } from '../ui/Toast';
import { PlusCircle } from 'lucide-react';

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: 'INCOME' | 'EXPENSE';
  onSuccess: () => void;
}

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({
  isOpen,
  onClose,
  defaultType = 'EXPENSE',
  onSuccess,
}) => {
  const { addToast } = useToast();
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(defaultType);
  const [origin, setOrigin] = useState<string>('OTHER');
  const [description, setDescription] = useState<string>('');
  const [grossAmount, setGrossAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState<string>('');
  const [competencyDate, setCompetencyDate] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [costCenterId, setCostCenterId] = useState<string>('');
  const [vehicleId, setVehicleId] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');
  const [notes, setNotes] = useState<string>('');

  const [categories, setCategories] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      const today = new Date().toISOString().split('T')[0];
      setDueDate(today);
      setCompetencyDate(today);
      setDescription('');
      setGrossAmount(0);
      setNotes('');
      setOrigin(defaultType === 'EXPENSE' ? 'MAINTENANCE' : 'EXTRA_FEE');

      // Load auxiliary data
      async function loadData() {
        try {
          const [catsRes, ccsRes, vehsRes, clisRes] = await Promise.all([
            api.financial.getCategories(type),
            api.financial.getCostCenters(),
            api.vehicles.list(),
            api.clients.list(),
          ]);
          setCategories(catsRes.data || []);
          setCostCenters(ccsRes.data || []);
          setVehicles(vehsRes.data || []);
          setClients(clisRes.data || []);

          if (catsRes.data?.length > 0) {
            setCategoryId(catsRes.data[0].id);
          }
          if (ccsRes.data?.length > 0) {
            setCostCenterId(ccsRes.data[0].id);
          }
        } catch (err) {
          console.error('Error loading options for new transaction:', err);
        }
      }
      loadData();
    }
  }, [isOpen, defaultType, type]);

  // Reload categories when type toggles
  const handleTypeChange = async (newType: 'INCOME' | 'EXPENSE') => {
    setType(newType);
    setOrigin(newType === 'EXPENSE' ? 'MAINTENANCE' : 'EXTRA_FEE');
    try {
      const res = await api.financial.getCategories(newType);
      setCategories(res.data || []);
      if (res.data?.length > 0) {
        setCategoryId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      addToast({ title: 'DESCRIÇÃO OBRIGATÓRIA', message: 'Informe a descrição do lançamento.', type: 'warning' });
      return;
    }
    if (grossAmount <= 0) {
      addToast({ title: 'VALOR INVÁLIDO', message: 'O valor deve ser maior que zero.', type: 'warning' });
      return;
    }

    try {
      setIsSubmitting(true);
      await api.financial.createTransaction({
        type,
        origin,
        description: description.toUpperCase(),
        grossAmount: Number(grossAmount),
        dueDate,
        competencyDate: competencyDate || dueDate,
        categoryId: categoryId || undefined,
        costCenterId: costCenterId || undefined,
        vehicleId: vehicleId || undefined,
        clientId: clientId || undefined,
        paymentMethod,
        notes: notes ? notes.toUpperCase() : undefined,
      });

      addToast({
        title: 'LANÇAMENTO REGISTRADO COM SUCESSO',
        message: `${type === 'INCOME' ? 'Receita' : 'Despesa'} lançada com sucesso no financeiro.`,
        type: 'success',
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      addToast({
        title: 'ERRO AO REGISTRAR',
        message: err.message || 'Falha ao cadastrar lançamento financeiro.',
        type: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={type === 'EXPENSE' ? 'NOVA CONTA A PAGAR / DESPESA' : 'NOVA CONTA A RECEBER / RECEITA AVULSA'}
      description="Cadastro de movimentação financeira com rateio por categoria e centro de custo."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type Selector Pills */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => handleTypeChange('EXPENSE')}
            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
              type === 'EXPENSE'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            DESPESA (CONTA A PAGAR)
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('INCOME')}
            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
              type === 'INCOME'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            RECEITA (CONTA A RECEBER)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-700 block mb-1">
              DESCRIÇÃO DO LANÇAMENTO *
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value.toUpperCase())}
              placeholder="EX: MANUTENÇÃO PREVENTIVA FREIOS, IPVA 2026, COMBUSTÍVEL..."
              required
              className="uppercase"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">VALOR (R$) *</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={grossAmount || ''}
              onChange={(e) => setGrossAmount(parseFloat(e.target.value) || 0)}
              required
              placeholder="0,00"
              className="font-mono font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">DATA DE VENCIMENTO *</label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">ORIGEM FINANCEIRA</label>
            <Select value={origin} onChange={(e) => setOrigin(e.target.value)}>
              {type === 'EXPENSE' ? (
                <>
                  <option value="MAINTENANCE">MANUTENÇÃO & OFICINA</option>
                  <option value="INSURANCE">SEGURO & RASTREADOR</option>
                  <option value="TAX">IPVA, LICENCIAMENTO & TAXAS</option>
                  <option value="FUEL">COMBUSTÍVEL</option>
                  <option value="SALARY">FOLHA DE PAGAMENTO / PRÓ-LABORE</option>
                  <option value="OFFICE">ADMINISTRATIVO / ESCRITÓRIO</option>
                  <option value="ACQUISITION">AQUISIÇÃO DE VEÍCULOS</option>
                  <option value="OTHER">OUTRA DESPESA</option>
                </>
              ) : (
                <>
                  <option value="RENTAL">LOCAÇÃO RECORRENTE</option>
                  <option value="EXTRA_FEE">TAXA EXTRA / KM EXCEDENTE</option>
                  <option value="DAMAGE">AVARIA & RESSARCIMENTO</option>
                  <option value="FINE">MULTA REPASSADA</option>
                  <option value="SALE">VENDA DE ATIVO / VEÍCULO</option>
                  <option value="OTHER">OUTRA RECEITA</option>
                </>
              )}
            </Select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">DATA DE COMPETÊNCIA</label>
            <Input
              type="date"
              value={competencyDate}
              onChange={(e) => setCompetencyDate(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">CATEGORIA FINANCEIRA</label>
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">SELECIONE UMA CATEGORIA</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">CENTRO DE CUSTO</label>
            <Select value={costCenterId} onChange={(e) => setCostCenterId(e.target.value)}>
              <option value="">GERAL / PADRÃO</option>
              {costCenters.map((cc) => (
                <option key={cc.id} value={cc.id}>
                  {cc.code} - {cc.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">VEÍCULO VINCULADO (OPCIONAL)</label>
            <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              <option value="">NENHUM VEÍCULO ESPECÍFICO</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate} - {v.brand} {v.model}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">CLIENTE VINCULADO (OPCIONAL)</label>
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">NENHUM CLIENTE ESPECÍFICO</option>
              {clients.map((cli) => (
                <option key={cli.id} value={cli.id}>
                  {cli.name} ({cli.cpfCnpj})
                </option>
              ))}
            </Select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-700 block mb-1">FORMA PREVISTA DE PAGAMENTO</label>
            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="PIX">PIX</option>
              <option value="BOLETO">BOLETO BANCÁRIO</option>
              <option value="CARTAO_CREDITO">CARTÃO DE CRÉDITO</option>
              <option value="CARTAO_DEBITO">CARTÃO DE DÉBITO</option>
              <option value="DINHEIRO">DINHEIRO</option>
              <option value="TRANSFERENCIA">TRANSFERÊNCIA / TED</option>
            </Select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-700 block mb-1">OBSERVAÇÕES / HISTÓRICO</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value.toUpperCase())}
              placeholder="DETALHES ADICIONAIS, NÚMERO DE NOTA FISCAL, ETC."
              className="uppercase"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || grossAmount <= 0}
            className="gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            {isSubmitting ? 'Salvando...' : 'Registrar Lançamento'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

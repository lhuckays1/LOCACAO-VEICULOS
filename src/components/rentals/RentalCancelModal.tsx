import React, { useState } from 'react';
import { Rental } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { api } from '../../services/api';
import { AlertTriangle } from 'lucide-react';

interface RentalCancelModalProps {
  rental: Rental | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RentalCancelModal: React.FC<RentalCancelModalProps> = ({
  rental,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!rental) return null;

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.rentals.cancel(rental.id, reason);
      toastSuccess('Locação cancelada', 'O contrato foi cancelado e o veículo liberado se estava reservado.');
      onSuccess();
      onClose();
    } catch (err: any) {
      toastError('Erro ao cancelar', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Cancelar Locação ${rental.codigoContrato || rental.rentalNumber}`}
      description="O cancelamento é permitido apenas para locações em Rascunho ou Agendadas."
      maxWidth="md"
    >
      <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs">
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-900">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Atenção: Ação Irreversível</span>
            <p className="mt-0.5 text-[11px] text-rose-800">
              Todas as parcelas futuras não pagas serão canceladas. O veículo voltará a ficar disponível para outros clientes.
            </p>
          </div>
        </div>

        <Input
          label="MOTIVO DO CANCELAMENTO"
          placeholder="Ex: Cliente desistiu da contratação por motivos particulares..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Voltar
          </Button>
          <Button
            type="submit"
            variant="danger"
            size="sm"
            isLoading={isSubmitting}
            className="font-bold"
          >
            Confirmar Cancelamento
          </Button>
        </div>
      </form>
    </Modal>
  );
};

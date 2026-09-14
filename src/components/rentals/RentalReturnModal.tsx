import React, { useState } from 'react';
import { Rental } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useToast } from '../ui/Toast';
import { api } from '../../services/api';
import {
  maskPlate,
  maskCurrency,
  maskMileage,
  formatDate,
} from '../../utils/formatters';
import {
  Car,
  CheckCircle2,
  AlertTriangle,
  Fuel,
  Gauge,
  ClipboardCheck,
} from 'lucide-react';

interface RentalReturnModalProps {
  rental: Rental | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RentalReturnModal: React.FC<RentalReturnModalProps> = ({
  rental,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { success: toastSuccess, error: toastError } = useToast();

  const [finalMileage, setFinalMileage] = useState<number>(
    (rental?.vehicle?.currentMileage || rental?.kmInicial || rental?.initialMileage || 0) + 150
  );
  const [finalFuelLevel, setFinalFuelLevel] = useState('CHEIO (1/1)');
  const [checklistItems, setChecklistItems] = useState([
    { item: 'Pneus e Estepe', ok: true },
    { item: 'Documentação CRLV Devolvida', ok: true },
    { item: 'Chave e Chave Reserva Entregues', ok: true },
    { item: 'Higienização e Limpeza', ok: true },
    { item: 'Vidros e Lataria sem amassados', ok: true },
  ]);
  const [newDamages, setNewDamages] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!rental) return null;

  const initialKm = rental.kmInicial ?? rental.initialMileage ?? 0;
  const initialFuel = rental.initialFuelLevel || 'CHEIO (1/1)';
  const kmDriven = Math.max(0, finalMileage - initialKm);
  const franchise = rental.franquiaKm || rental.mileageAllowance || 0;
  const excessKm = franchise > 0 ? Math.max(0, kmDriven - franchise) : 0;
  const excessRate = rental.valorKmExcedente || rental.excessMileageRate || 0.5;
  const excessCharge = excessKm * excessRate;

  const toggleChecklist = (index: number) => {
    setChecklistItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ok: !item.ok } : item))
    );
  };

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();

    if (finalMileage < initialKm) {
      toastError(
        'KM Inválido',
        `A quilometragem final (${finalMileage} KM) não pode ser menor que a inicial (${initialKm} KM).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const damagesArray = newDamages
        ? newDamages
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      await api.rentals.updateStatus(rental.id, {
        status: 'FINALIZADA',
        finalMileage,
        finalFuelLevel,
        notes,
        checkListRetorno: checklistItems,
        avariasRetorno: damagesArray,
      });

      toastSuccess(
        'Devolução Concluída com Sucesso!',
        `Veículo ${rental.vehicle?.plate} liberado e marcado como DISPONÍVEL.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toastError('Erro na devolução', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Devolução do Veículo - ${rental.codigoContrato || rental.rentalNumber}`}
      description="Registre a vistoria de retorno, quilometragem final e libere o veículo para a frota."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmitReturn} className="space-y-4 text-xs">
        {/* Banner */}
        <div className="p-3.5 bg-slate-900 text-white rounded-xl flex items-center justify-between">
          <div>
            <div className="font-mono text-xs text-emerald-400 font-bold">
              {rental.codigoContrato || rental.rentalNumber}
            </div>
            <div className="font-bold text-sm text-white mt-0.5">{rental.client?.name}</div>
          </div>
          <div className="text-right">
            <span className="font-mono bg-white text-slate-900 font-bold px-2 py-0.5 rounded text-xs">
              {rental.vehicle?.plate}
            </span>
            <div className="text-[10px] text-slate-300 mt-1">
              {rental.vehicle?.brand} {rental.vehicle?.model}
            </div>
          </div>
        </div>

        {/* Departure Reference */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">KM na Saída</span>
            <div className="font-bold text-slate-800 text-sm mt-0.5">{maskMileage(initialKm)}</div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Combustível na Saída</span>
            <div className="font-bold text-slate-800 text-sm mt-0.5">{initialFuel}</div>
          </div>
        </div>

        {/* Return Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="QUILOMETRAGEM FINAL NO RETORNO (KM)"
            type="number"
            value={finalMileage}
            onChange={(e) => setFinalMileage(parseInt(e.target.value) || 0)}
            required
            helperText={`Total rodado pelo cliente: ${maskMileage(kmDriven)}`}
          />

          <Select
            label="NÍVEL DE COMBUSTÍVEL NO RETORNO"
            value={finalFuelLevel}
            onChange={(e) => setFinalFuelLevel(e.target.value)}
          >
            <option value="CHEIO (1/1)">CHEIO (1/1)</option>
            <option value="3/4">3/4 DO TANQUE</option>
            <option value="1/2">1/2 (MEIO TANQUE)</option>
            <option value="1/4">1/4 DO TANQUE</option>
            <option value="RESERVA">RESERVA</option>
          </Select>
        </div>

        {/* Excessive Mileage calculation alert */}
        {franchise > 0 && excessKm > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-amber-900">
            <div>
              <div className="font-bold text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Franquia Excedida: {excessKm} KM adicionais
              </div>
              <div className="text-[11px] text-amber-800">
                Franquia contratada: {franchise} KM | Taxa: {maskCurrency(excessRate)}/KM
              </div>
            </div>
            <div className="font-mono font-black text-sm text-amber-950">
              + {maskCurrency(excessCharge)}
            </div>
          </div>
        )}

        {/* Checklist */}
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider flex items-center gap-1.5">
            <ClipboardCheck className="w-3.5 h-3.5 text-emerald-600" />
            Checklist de Retorno
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {checklistItems.map((item, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => toggleChecklist(idx)}
                className={`p-2 rounded border text-left flex items-center justify-between transition-colors ${
                  item.ok
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <span>{item.item}</span>
                <span className="font-bold text-[10px]">{item.ok ? 'OK ✓' : 'AVARIADO ✗'}</span>
              </button>
            ))}
          </div>
        </div>

        <Input
          label="AVARIAS / DETALHES IDENTIFICADOS NA DEVOLUÇÃO"
          placeholder="Ex: Risco na porta do motorista, pneu dianteiro furado..."
          value={newDamages}
          onChange={(e) => setNewDamages(e.target.value)}
        />

        <Input
          label="OBSERVAÇÕES DA DEVOLUÇÃO"
          placeholder="Ex: Veículo devolvido em perfeito estado, caução estornado via PIX..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            className="font-bold bg-emerald-600 hover:bg-emerald-700"
          >
            Confirmar Devolução & Liberar Carro
          </Button>
        </div>
      </form>
    </Modal>
  );
};

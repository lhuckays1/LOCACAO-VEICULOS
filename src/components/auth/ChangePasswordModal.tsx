import React, { useEffect, useState } from 'react';
import { KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { api } from '../../services/api';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { success: toastSuccess, error: toastError } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setIsSaving(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (isSaving) return;

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);

    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toastError(
        'Preencha todos os campos',
        'Informe sua senha atual e a nova senha.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      toastError(
        'Senhas não conferem',
        'A confirmação deve ser igual à nova senha.'
      );
      return;
    }

    if (currentPassword === newPassword) {
      toastError(
        'Senha inválida',
        'A nova senha deve ser diferente da senha atual.'
      );
      return;
    }

    setIsSaving(true);

    try {
      await api.auth.changePassword({
        currentPassword,
        newPassword,
      });

      toastSuccess(
        'Senha alterada com sucesso!',
        'Sua nova senha já está ativa.'
      );

      handleClose();
    } catch (err: any) {
      toastError(
        'Não foi possível alterar a senha',
        err?.message || 'Verifique os dados informados e tente novamente.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Alterar Senha"
      description="Atualize a senha de acesso à sua conta."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-[11px] text-emerald-900">
            <p className="font-bold">Senha segura</p>
            <p className="mt-0.5 text-emerald-800">
              A nova senha deverá respeitar a política de segurança definida
              para a plataforma.
            </p>
          </div>
        </div>

        <div className="relative">
          <Input
            label="SENHA ATUAL"
            type={showCurrentPassword ? 'text' : 'password'}
            value={currentPassword}
            autoUppercase={false}
            onChange={(event) => setCurrentPassword(event.target.value)}
            icon={<KeyRound className="w-4 h-4" />}
            placeholder="Digite sua senha atual"
            required
          />

          <button
            type="button"
            onClick={() => setShowCurrentPassword((value) => !value)}
            className="absolute right-3 bottom-2.5 p-1 text-slate-400 hover:text-slate-700 transition-colors"
            title={showCurrentPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showCurrentPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="relative">
          <Input
            label="NOVA SENHA"
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            autoUppercase={false}
            onChange={(event) => setNewPassword(event.target.value)}
            icon={<KeyRound className="w-4 h-4" />}
            placeholder="Digite sua nova senha"
            helperText="A senha precisa respeitar a política de segurança da plataforma."
            required
          />

          <button
            type="button"
            onClick={() => setShowNewPassword((value) => !value)}
            className="absolute right-3 bottom-8 p-1 text-slate-400 hover:text-slate-700 transition-colors"
            title={showNewPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showNewPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="relative">
          <Input
            label="CONFIRMAR NOVA SENHA"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            autoUppercase={false}
            onChange={(event) => setConfirmPassword(event.target.value)}
            icon={<KeyRound className="w-4 h-4" />}
            placeholder="Digite novamente a nova senha"
            required
          />

          <button
            type="button"
            onClick={() => setShowConfirmPassword((value) => !value)}
            className="absolute right-3 bottom-2.5 p-1 text-slate-400 hover:text-slate-700 transition-colors"
            title={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showConfirmPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClose}
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
            Alterar Senha
          </Button>
        </div>
      </form>
    </Modal>
  );
};

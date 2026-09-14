import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  X,
} from 'lucide-react';

import { api } from '../../services/api';

interface Administrator {
  id: string;
  name: string;
  email: string;
}

interface ResetAdministratorPasswordModalProps {
  administrator: Administrator;
  onClose: () => void;
  onUpdated: () => void | Promise<void>;
}

export const ResetAdministratorPasswordModal: React.FC<
  ResetAdministratorPasswordModalProps
> = ({
  administrator,
  onClose,
  onUpdated,
}) => {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] = useState('');

  const [success, setSuccess] =
    useState(false);

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError('');

    if (!password) {
      setError('Informe a nova senha.');
      return;
    }

    if (password.length < 8) {
      setError(
        'A senha deve possuir pelo menos 8 caracteres.'
      );
      return;
    }

    if (!confirmation) {
      setError(
        'Confirme a nova senha.'
      );
      return;
    }

    if (password !== confirmation) {
      setError(
        'As senhas não conferem.'
      );
      return;
    }

    try {
      setIsLoading(true);

      await api.superAdmin.resetAdministratorPassword(
        administrator.id,
        password
      );

      setSuccess(true);

      await onUpdated();

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      console.error(
        '[SUPER ADMIN] Erro ao redefinir senha:',
        err
      );

      setError(
        err?.message ||
          'Não foi possível redefinir a senha.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <KeyRound className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-900">
                Redefinir senha
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {administrator.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* CONTEÚDO */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-6"
        >
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Usuário
            </p>

            <p className="mt-1 font-bold text-slate-800">
              {administrator.email}
            </p>
          </div>

          {/* NOVA SENHA */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Nova senha
            </label>

            <div className="relative">
              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                disabled={isLoading}
                autoFocus
                placeholder="Mínimo de 8 caracteres"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 disabled:bg-slate-50"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* CONFIRMAÇÃO */}
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">
              Confirmar nova senha
            </label>

            <div className="relative">
              <input
                type={
                  showConfirmation
                    ? 'text'
                    : 'password'
                }
                value={confirmation}
                onChange={(event) =>
                  setConfirmation(
                    event.target.value
                  )
                }
                disabled={isLoading}
                placeholder="Digite novamente a senha"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 disabled:bg-slate-50"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmation(
                    !showConfirmation
                  )
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:text-slate-700"
              >
                {showConfirmation ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* ERRO */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {/* SUCESSO */}
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
              Senha redefinida com sucesso!
            </div>
          )}

          {/* BOTÕES */}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isLoading || success}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Redefinir senha
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
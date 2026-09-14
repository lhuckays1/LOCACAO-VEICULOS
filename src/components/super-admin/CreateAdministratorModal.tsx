import React, { useEffect, useState } from 'react';
import {
  X,
  UserRound,
  Mail,
  Lock,
  ShieldCheck,
  Building2,
  Eye,
  EyeOff,
  Loader2,
  CircleCheck,
  AlertCircle,
} from 'lucide-react';

import { api } from '../../services/api';

interface Company {
  id: string;
  name: string;
}

interface CreateAdministratorModalProps {
  onClose: () => void;
  onCreated?: () => void;
}

type AdministratorRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'OPERATOR'
  | 'FINANCIAL';

export const CreateAdministratorModal: React.FC<
  CreateAdministratorModalProps
> = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AdministratorRole>('ADMIN');
  const [companyId, setCompanyId] = useState('');

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isSuperAdmin = role === 'SUPER_ADMIN';

  useEffect(() => {
    const loadCompanies = async () => {
      try {
        setLoadingCompanies(true);

        const response = await api.companies.list();

        const data =
          response?.data ||
          response?.companies ||
          response ||
          [];

        setCompanies(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(
          '[SUPER ADMIN] Erro ao carregar empresas:',
          err
        );

        setError(
          'Não foi possível carregar as empresas cadastradas.'
        );
      } finally {
        setLoadingCompanies(false);
      }
    };

    loadCompanies();
  }, []);

  const handleRoleChange = (
    newRole: AdministratorRole
  ) => {
    setRole(newRole);

    if (newRole === 'SUPER_ADMIN') {
      setCompanyId('');
    }
  };

  const validateForm = () => {
    if (!name.trim()) {
      return 'Informe o nome completo.';
    }

    if (!email.trim()) {
      return 'Informe o e-mail.';
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      return 'Informe um e-mail válido.';
    }

    if (!password) {
      return 'Informe uma senha.';
    }

    if (password.length < 8) {
      return 'A senha deve possuir pelo menos 8 caracteres.';
    }

    if (!role) {
      return 'Selecione o perfil de acesso.';
    }

    if (!isSuperAdmin && !companyId) {
      return 'Selecione a empresa do administrador.';
    }

    return '';
  };

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsSaving(true);

      await api.superAdmin.createAdministrator({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
        companyId: isSuperAdmin ? null : companyId,
      });

      setSuccess(
        'Administrador criado com sucesso!'
      );

      if (onCreated) {
        onCreated();
      }

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      console.error(
        '[SUPER ADMIN] Erro ao criar administrador:',
        err
      );

      setError(
        err?.message ||
          'Não foi possível criar o administrador.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <ShieldCheck className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900">
                Novo Administrador
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Cadastre um novo usuário administrativo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
            {/* ALERTA DE ERRO */}
            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                <span>{error}</span>
              </div>
            )}

            {/* SUCESSO */}
            {success && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" />

                <span>{success}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* NOME */}
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Nome completo
                </label>

                <div className="relative">
                  <UserRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    placeholder="Ex.: João da Silva"
                    disabled={isSaving}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-medium text-slate-800 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 disabled:opacity-60"
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  E-mail
                </label>

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="usuario@empresa.com"
                    disabled={isSaving}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-medium text-slate-800 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 disabled:opacity-60"
                  />
                </div>
              </div>

              {/* SENHA */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Senha
                </label>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    type={
                      showPassword
                        ? 'text'
                        : 'password'
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Mínimo 8 caracteres"
                    disabled={isSaving}
                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-12 text-sm font-medium text-slate-800 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* PERFIL */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Perfil de acesso
                </label>

                <div className="relative">
                  <ShieldCheck className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <select
                    value={role}
                    onChange={(event) =>
                      handleRoleChange(
                        event.target
                          .value as AdministratorRole
                      )
                    }
                    disabled={isSaving}
                    className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-bold text-slate-800 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 disabled:opacity-60"
                  >
                    <option value="ADMIN">
                      Administrador
                    </option>

                    <option value="MANAGER">
                      Gerente
                    </option>

                    <option value="OPERATOR">
                      Operador
                    </option>

                    <option value="FINANCIAL">
                      Financeiro
                    </option>

                    <option value="SUPER_ADMIN">
                      Super Admin
                    </option>
                  </select>
                </div>
              </div>

              {/* EMPRESA */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Empresa
                </label>

                {isSuperAdmin ? (
                  <div className="flex h-12 items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4">
                    <Building2 className="h-5 w-5 text-violet-600" />

                    <div>
                      <p className="text-sm font-bold text-violet-700">
                        Plataforma Global
                      </p>

                      <p className="text-xs text-violet-500">
                        Acesso a todas as empresas
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <select
                      value={companyId}
                      onChange={(event) =>
                        setCompanyId(
                          event.target.value
                        )
                      }
                      disabled={
                        isSaving ||
                        loadingCompanies
                      }
                      className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-bold text-slate-800 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-4 focus:ring-violet-500/10 disabled:opacity-60"
                    >
                      <option value="">
                        {loadingCompanies
                          ? 'Carregando empresas...'
                          : 'Selecione a empresa'}
                      </option>

                      {companies.map((company) => (
                        <option
                          key={company.id}
                          value={company.id}
                        >
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* INFORMAÇÃO */}
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs leading-5 text-slate-500">
                <strong className="text-slate-700">
                  Atenção:
                </strong>{' '}
                usuários administrativos vinculados a
                uma empresa terão acesso somente aos
                dados daquela empresa. O perfil Super
                Admin possui acesso global à plataforma.
              </p>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition hover:from-violet-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <CircleCheck className="h-4 w-4" />
                  Criar Administrador
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
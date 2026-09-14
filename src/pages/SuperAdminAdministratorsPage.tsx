import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ShieldCheck,
  Search,
  Plus,
  MoreVertical,
  Mail,
  Building2,
  UserRound,
  CircleCheck,
  CircleX,
  RefreshCw,
  Users,
  Pencil,
  Power,
  X,
  KeyRound,
  Trash2,
} from 'lucide-react';

import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

import { CreateAdministratorModal } from '../components/super-admin/CreateAdministratorModal';
import { EditAdministratorModal } from '../components/super-admin/EditAdministratorModal';
import { ResetAdministratorPasswordModal } from '../components/super-admin/ResetAdministratorPasswordModal';

interface Administrator {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  company?: {
    id: string;
    name: string;
  } | null;
}

export const SuperAdminAdministratorsPage: React.FC = () => {
  const { user } = useAuth();

  const [openModal, setOpenModal] =
    useState(false);

  const [editAdministrator, setEditAdministrator] =
    useState<Administrator | null>(null);

  const [resetPasswordAdministrator, setResetPasswordAdministrator] =
    useState<Administrator | null>(null);

  const [openMenuId, setOpenMenuId] =
    useState<string | null>(null);

  const [administrators, setAdministrators] =
    useState<Administrator[]>([]);

  const [search, setSearch] = useState('');

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] = useState('');

  const [actionLoadingId, setActionLoadingId] =
    useState<string | null>(null);

  /**
   * ============================================================
   * CARREGAR ADMINISTRADORES
   * ============================================================
   */
  const loadAdministrators = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response =
        await api.superAdmin.getAdministrators();

      const data = response?.data || [];

      setAdministrators(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        '[SUPER ADMIN] Erro ao carregar administradores:',
        err
      );

      setError(
        'Não foi possível carregar os administradores da plataforma.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdministrators();
  }, []);

  /**
   * ============================================================
   * BUSCA
   * ============================================================
   */
  const filteredAdministrators = useMemo(() => {
    const term = search
      .toLowerCase()
      .trim();

    if (!term) {
      return administrators;
    }

    return administrators.filter(
      (admin) => {
        return (
          admin.name
            ?.toLowerCase()
            .includes(term) ||
          admin.email
            ?.toLowerCase()
            .includes(term) ||
          admin.company?.name
            ?.toLowerCase()
            .includes(term) ||
          admin.role
            ?.toLowerCase()
            .includes(term)
        );
      }
    );
  }, [administrators, search]);

  /**
   * ============================================================
   * LABEL DO PERFIL
   * ============================================================
   */
  const getRoleLabel = (
    role: string
  ) => {
    const roles: Record<
      string,
      string
    > = {
      SUPER_ADMIN: 'Super Admin',
      ADMIN: 'Administrador',
      MANAGER: 'Gerente',
      OPERATOR: 'Operador',
      FINANCIAL: 'Financeiro',
    };

    return roles[role] || role;
  };

  /**
   * ============================================================
   * ATIVAR / DESATIVAR
   * ============================================================
   */
  const handleToggleStatus = async (
    administrator: Administrator
  ) => {
    setOpenMenuId(null);

    if (administrator.id === user?.id) {
      return;
    }

    const action = administrator.active
      ? 'desativar'
      : 'ativar';

    const confirmed =
      window.confirm(
        `Deseja ${action} o acesso de "${administrator.name}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoadingId(
        administrator.id
      );

      setError('');

      await api.superAdmin.toggleAdministratorStatus(
        administrator.id
      );

      await loadAdministrators();
    } catch (err: any) {
      console.error(
        '[SUPER ADMIN] Erro ao alterar status:',
        err
      );

      setError(
        err?.message ||
          'Não foi possível alterar o status do administrador.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  /**
   * ============================================================
   * EDITAR
   * ============================================================
   */
  const handleEdit = (
    administrator: Administrator
  ) => {
    setOpenMenuId(null);

    setEditAdministrator(
      administrator
    );
  };

  /**
   * ============================================================
   * REDEFINIR SENHA
   * ============================================================
   */
  const handleResetPassword = (
    administrator: Administrator
  ) => {
    setOpenMenuId(null);
    setError('');

    setResetPasswordAdministrator(
      administrator
    );
  };

  /**
   * ============================================================
   * EXCLUIR
   * ============================================================
   */
  const handleDelete = async (
    administrator: Administrator
  ) => {
    setOpenMenuId(null);

    /**
     * Proteção visual contra exclusão
     * da própria conta.
     */
    if (administrator.id === user?.id) {
      setError(
        'Você não pode excluir a própria conta.'
      );
      return;
    }

    const confirmed =
      window.confirm(
        `ATENÇÃO!\n\nDeseja realmente excluir o administrador "${administrator.name}"?\n\nEssa operação é permanente e não poderá ser desfeita.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoadingId(
        administrator.id
      );

      setError('');

      await api.superAdmin.deleteAdministrator(
        administrator.id
      );

      await loadAdministrators();
    } catch (err: any) {
      console.error(
        '[SUPER ADMIN] Erro ao excluir administrador:',
        err
      );

      setError(
        err?.message ||
          'Não foi possível excluir o administrador.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  /**
   * ============================================================
   * FECHAR MENU AO CLICAR
   * ============================================================
   */
  useEffect(() => {
    const handleDocumentClick = () => {
      setOpenMenuId(null);
    };

    if (openMenuId) {
      document.addEventListener(
        'click',
        handleDocumentClick
      );
    }

    return () => {
      document.removeEventListener(
        'click',
        handleDocumentClick
      );
    };
  }, [openMenuId]);

  return (
    <div className="space-y-8">
      {/* ======================================================
          HEADER
      ====================================================== */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <Users className="h-5 w-5" />
            </div>

            <span className="text-sm font-black uppercase tracking-[0.18em] text-violet-600">
              Gestão da Plataforma
            </span>
          </div>

          <h1 className="text-4xl font-black tracking-tight text-slate-900">
            Administradores
          </h1>

          <p className="mt-2 text-slate-500">
            Gerencie os usuários administrativos e
            seus níveis de acesso.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            setOpenModal(true)
          }
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-600/20 transition-all hover:from-violet-700 hover:to-purple-700 lg:w-auto"
        >
          <Plus className="h-5 w-5" />
          Novo Administrador
        </button>
      </div>

      {/* ======================================================
          RESUMO
      ====================================================== */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {/* TOTAL */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                Total
              </p>

              <p className="mt-3 text-3xl font-black text-slate-900">
                {administrators.length}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Usuários administrativos
              </p>
            </div>

            <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* ATIVOS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                Ativos
              </p>

              <p className="mt-3 text-3xl font-black text-emerald-600">
                {
                  administrators.filter(
                    (admin) =>
                      admin.active
                  ).length
                }
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Com acesso liberado
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
              <CircleCheck className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* SUPER ADMIN */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                Super Admin
              </p>

              <p className="mt-3 text-3xl font-black text-violet-600">
                {
                  administrators.filter(
                    (admin) =>
                      admin.role ===
                      'SUPER_ADMIN'
                  ).length
                }
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Acesso global à plataforma
              </p>
            </div>

            <div className="rounded-xl bg-purple-50 p-3 text-purple-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================
          BUSCA
      ====================================================== */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Buscar por nome, e-mail, empresa ou perfil..."
              className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
            />
          </div>

          <button
            type="button"
            onClick={loadAdministrators}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 font-bold text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* ======================================================
          ERRO
      ====================================================== */}
      {error && (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          <p>{error}</p>

          <button
            type="button"
            onClick={() => setError('')}
            className="rounded-lg p-1 hover:bg-red-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ======================================================
          LOADING
      ====================================================== */}
      {isLoading && (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-violet-600" />

          <p className="mt-4 font-semibold text-slate-500">
            Carregando administradores...
          </p>
        </div>
      )}

      {/* ======================================================
          LISTA
      ====================================================== */}
      {!isLoading && !error && (
        <div className="overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="font-black text-slate-900">
              Usuários Administrativos
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filteredAdministrators.length}{' '}
              administrador(es) encontrado(s)
            </p>
          </div>

          {filteredAdministrators.length ===
          0 ? (
            <div className="py-16 text-center">
              <UserRound className="mx-auto h-12 w-12 text-slate-300" />

              <h3 className="mt-4 font-bold text-slate-700">
                Nenhum administrador encontrado
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Tente alterar os termos da busca.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredAdministrators.map(
                (admin) => {
                  const isCurrentUser =
                    admin.id === user?.id;

                  const isActionLoading =
                    actionLoadingId ===
                    admin.id;

                  return (
                    <div
                      key={admin.id}
                      className="flex flex-col gap-5 p-6 transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between"
                    >
                      {/* DADOS */}
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 font-black text-white shadow-lg shadow-violet-500/20">
                          {admin.name
                            ?.charAt(0)
                            ?.toUpperCase() ||
                            'A'}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-black text-slate-900">
                              {admin.name}
                            </h3>

                            {isCurrentUser && (
                              <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                                Você
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex flex-col gap-2 text-sm text-slate-500 md:flex-row md:items-center md:gap-5">
                            <span className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              {admin.email}
                            </span>

                            <span className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {admin.company
                                ?.name ||
                                'Plataforma Global'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* AÇÕES */}
                      <div className="flex items-center gap-3">
                        <span className="rounded-lg bg-violet-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-violet-700">
                          {getRoleLabel(
                            admin.role
                          )}
                        </span>

                        {admin.active ? (
                          <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-emerald-700">
                            <CircleCheck className="h-3.5 w-3.5" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-black uppercase tracking-wide text-red-700">
                            <CircleX className="h-3.5 w-3.5" />
                            Inativo
                          </span>
                        )}

                        {/* MENU */}
                        <div className="relative">
                          <button
                            type="button"
                            disabled={
                              isActionLoading
                            }
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation();

                              setOpenMenuId(
                                openMenuId ===
                                  admin.id
                                  ? null
                                  : admin.id
                              );
                            }}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isActionLoading ? (
                              <RefreshCw className="h-5 w-5 animate-spin" />
                            ) : (
                              <MoreVertical className="h-5 w-5" />
                            )}
                          </button>

                          {openMenuId ===
                            admin.id && (
                            <div
                              onClick={(event) =>
                                event.stopPropagation()
                              }
                              className="absolute right-0 top-11 z-30 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
                            >
                              {/* EDITAR */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleEdit(
                                    admin
                                  )
                                }
                                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                <Pencil className="h-4 w-4 text-violet-600" />

                                Editar administrador
                              </button>

                              {/* REDEFINIR SENHA */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleResetPassword(
                                    admin
                                  )
                                }
                                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                <KeyRound className="h-4 w-4 text-amber-500" />

                                Redefinir senha
                              </button>

                              {/* STATUS */}
                              {!isCurrentUser && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleStatus(
                                      admin
                                    )
                                  }
                                  className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold transition hover:bg-slate-50 ${
                                    admin.active
                                      ? 'text-red-600'
                                      : 'text-emerald-600'
                                  }`}
                                >
                                  <Power className="h-4 w-4" />

                                  {admin.active
                                    ? 'Desativar acesso'
                                    : 'Ativar acesso'}
                                </button>
                              )}

                              {/* EXCLUIR */}
                              {!isCurrentUser && (
                                <>
                                  <div className="my-1 border-t border-slate-100" />

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDelete(
                                        admin
                                      )
                                    }
                                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />

                                    Excluir administrador
                                  </button>
                                </>
                              )}

                              {/* PRÓPRIO USUÁRIO */}
                              {isCurrentUser && (
                                <div className="border-t border-slate-100 px-4 py-3 text-xs leading-5 text-slate-400">
                                  Você não pode
                                  desativar ou
                                  excluir a
                                  própria conta.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      )}

      {/* ======================================================
          MODAL NOVO
      ====================================================== */}
      {openModal && (
        <CreateAdministratorModal
          onClose={() =>
            setOpenModal(false)
          }
          onCreated={
            loadAdministrators
          }
        />
      )}

      {/* ======================================================
          MODAL EDITAR
      ====================================================== */}
      {editAdministrator && (
        <EditAdministratorModal
          administrator={
            editAdministrator
          }
          onClose={() =>
            setEditAdministrator(
              null
            )
          }
          onUpdated={
            loadAdministrators
          }
        />
      )}

      {/* ======================================================
          MODAL REDEFINIR SENHA
      ====================================================== */}
      {resetPasswordAdministrator && (
        <ResetAdministratorPasswordModal
          administrator={
            resetPasswordAdministrator
          }
          onClose={() =>
            setResetPasswordAdministrator(
              null
            )
          }
          onUpdated={
            loadAdministrators
          }
        />
      )}
    </div>
  );
};
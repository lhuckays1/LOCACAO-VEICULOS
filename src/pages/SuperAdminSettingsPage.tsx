import React, { useEffect, useState } from 'react';
import {
  Settings,
  Save,
  RefreshCw,
  Building2,
  ShieldCheck,
  Bell,
  Globe2,
  LockKeyhole,
  Wrench,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

import { api, ApiError } from '../services/api';

interface PlatformSettings {
  id: string;

  platformName: string;
  platformShortName: string;
  logo: string | null;
  supportEmail: string | null;

  country: string;
  currency: string;
  timezone: string;
  dateFormat: string;

  minimumPasswordLength: number;
  requireStrongPassword: boolean;
  sessionDurationMinutes: number;

  maintenanceMode: boolean;
  allowRegistration: boolean;

  notificationsEnabled: boolean;

  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  id: 'platform',

  platformName: 'FROTA CONTROL',
  platformShortName: 'FROTA',

  logo: null,
  supportEmail: null,

  country: 'BR',
  currency: 'BRL',
  timezone: 'America/Sao_Paulo',
  dateFormat: 'DD/MM/YYYY',

  minimumPasswordLength: 8,
  requireStrongPassword: true,
  sessionDurationMinutes: 480,

  maintenanceMode: false,
  allowRegistration: false,

  notificationsEnabled: true,
};

export const SuperAdminSettingsPage: React.FC = () => {
  const [settings, setSettings] =
    useState<PlatformSettings>(DEFAULT_SETTINGS);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [successMessage, setSuccessMessage] =
    useState('');

  const [errorMessage, setErrorMessage] =
    useState('');

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      setSuccessMessage('');

      const response =
        await api.superAdmin.getPlatformSettings();

      setSettings({
        ...DEFAULT_SETTINGS,
        ...(response.data || {}),
      });
    } catch (error) {
      console.error(
        'Erro ao carregar configurações:',
        error
      );

      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          'Não foi possível carregar as configurações da plataforma.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateField = <
    K extends keyof PlatformSettings
  >(
    field: K,
    value: PlatformSettings[K]
  ) => {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));

    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMessage('');
      setSuccessMessage('');

      const response =
        await api.superAdmin.updatePlatformSettings({
          platformName: settings.platformName,
          platformShortName: settings.platformShortName,
          logo: settings.logo,
          supportEmail: settings.supportEmail,

          country: settings.country,
          currency: settings.currency,
          timezone: settings.timezone,
          dateFormat: settings.dateFormat,

          minimumPasswordLength:
            settings.minimumPasswordLength,

          requireStrongPassword:
            settings.requireStrongPassword,

          sessionDurationMinutes:
            settings.sessionDurationMinutes,

          maintenanceMode:
            settings.maintenanceMode,

          allowRegistration:
            settings.allowRegistration,

          notificationsEnabled:
            settings.notificationsEnabled,
        });

      setSettings({
        ...DEFAULT_SETTINGS,
        ...(response.data || {}),
      });

      window.dispatchEvent(
        new CustomEvent('platform-settings-updated', {
            detail: response.data,
        })
        );

      setSuccessMessage(
        'Configurações salvas com sucesso.'
      );

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (error) {
      console.error(
        'Erro ao salvar configurações:',
        error
      );

      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage(
          'Não foi possível salvar as configurações da plataforma.'
        );
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center">
            <Settings className="w-5 h-5 text-violet-600 animate-pulse" />
          </div>

          <div>
            <h1 className="text-xl font-black text-slate-900">
              Configurações da Plataforma
            </h1>

            <p className="text-sm text-slate-500">
              Carregando configurações...
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-8">
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-7 h-7 text-violet-500 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        <div className="flex items-center gap-3">

          <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center">
            <Settings className="w-5 h-5 text-violet-600" />
          </div>

          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900">
              Configurações da Plataforma
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Gerencie as configurações globais do FROTA CONTROL.
            </p>
          </div>

        </div>

        <div className="flex items-center gap-2">

          <button
            type="button"
            onClick={loadSettings}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors disabled:opacity-50 shadow-lg shadow-violet-600/20"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Salvar configurações
              </>
            )}
          </button>

        </div>

      </div>

      {/* SUCCESS */}
      {successMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />

          <div>
            <p className="text-sm font-bold text-emerald-800">
              Sucesso
            </p>

            <p className="text-sm text-emerald-700 mt-0.5">
              {successMessage}
            </p>
          </div>
        </div>
      )}

      {/* ERROR */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />

          <div>
            <p className="text-sm font-bold text-red-800">
              Não foi possível concluir a operação
            </p>

            <p className="text-sm text-red-700 mt-0.5">
              {errorMessage}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* IDENTIDADE */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

          <div className="px-6 py-5 border-b border-slate-200">
            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-violet-600" />
              </div>

              <div>
                <h2 className="text-sm font-black text-slate-900">
                  Identidade da plataforma
                </h2>

                <p className="text-xs text-slate-500 mt-0.5">
                  Informações utilizadas na identificação do sistema.
                </p>
              </div>

            </div>
          </div>

          <div className="p-6 space-y-5">

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Nome da plataforma
              </label>

              <input
                type="text"
                value={settings.platformName}
                onChange={(e) =>
                  updateField(
                    'platformName',
                    e.target.value
                  )
                }
                placeholder="FROTA CONTROL"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Nome curto
              </label>

              <input
                type="text"
                value={settings.platformShortName}
                onChange={(e) =>
                  updateField(
                    'platformShortName',
                    e.target.value
                  )
                }
                placeholder="FROTA"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                URL da logo
              </label>

              <input
                type="text"
                value={settings.logo || ''}
                onChange={(e) =>
                  updateField(
                    'logo',
                    e.target.value || null
                  )
                }
                placeholder="https://..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />

              <p className="text-[11px] text-slate-400 mt-2">
                Informe uma URL pública da imagem da logo.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                E-mail de suporte
              </label>

              <input
                type="email"
                value={settings.supportEmail || ''}
                onChange={(e) =>
                  updateField(
                    'supportEmail',
                    e.target.value || null
                  )
                }
                placeholder="suporte@empresa.com.br"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              />
            </div>

          </div>

        </section>

        {/* REGIONAL */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

          <div className="px-6 py-5 border-b border-slate-200">
            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Globe2 className="w-5 h-5 text-blue-600" />
              </div>

              <div>
                <h2 className="text-sm font-black text-slate-900">
                  Configurações regionais
                </h2>

                <p className="text-xs text-slate-500 mt-0.5">
                  Padrões de localização e apresentação.
                </p>
              </div>

            </div>
          </div>

          <div className="p-6 space-y-5">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  País
                </label>

                <select
                  value={settings.country}
                  onChange={(e) =>
                    updateField(
                      'country',
                      e.target.value
                    )
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                >
                  <option value="BR">
                    Brasil
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Moeda
                </label>

                <select
                  value={settings.currency}
                  onChange={(e) =>
                    updateField(
                      'currency',
                      e.target.value
                    )
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                >
                  <option value="BRL">
                    Real brasileiro (BRL)
                  </option>
                </select>
              </div>

            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Fuso horário
              </label>

              <select
                value={settings.timezone}
                onChange={(e) =>
                  updateField(
                    'timezone',
                    e.target.value
                  )
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              >
                <option value="America/Sao_Paulo">
                  America/Sao_Paulo — Brasília
                </option>

                <option value="America/Manaus">
                  America/Manaus — Manaus
                </option>

                <option value="America/Rio_Branco">
                  America/Rio_Branco — Acre
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Formato de data
              </label>

              <select
                value={settings.dateFormat}
                onChange={(e) =>
                  updateField(
                    'dateFormat',
                    e.target.value
                  )
                }
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
              >
                <option value="DD/MM/YYYY">
                  DD/MM/YYYY
                </option>

                <option value="MM/DD/YYYY">
                  MM/DD/YYYY
                </option>

                <option value="YYYY-MM-DD">
                  YYYY-MM-DD
                </option>
              </select>
            </div>

          </div>

        </section>

        {/* SEGURANÇA */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

          <div className="px-6 py-5 border-b border-slate-200">
            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <LockKeyhole className="w-5 h-5 text-amber-600" />
              </div>

              <div>
                <h2 className="text-sm font-black text-slate-900">
                  Segurança
                </h2>

                <p className="text-xs text-slate-500 mt-0.5">
                  Políticas globais de autenticação.
                </p>
              </div>

            </div>
          </div>

          <div className="p-6 space-y-5">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Senha mínima
                </label>

                <input
                  type="number"
                  min={6}
                  max={128}
                  value={settings.minimumPasswordLength}
                  onChange={(e) =>
                    updateField(
                      'minimumPasswordLength',
                      Number(e.target.value)
                    )
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />

                <p className="text-[11px] text-slate-400 mt-2">
                  Mínimo permitido: 6 caracteres.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Sessão
                </label>

                <select
                  value={settings.sessionDurationMinutes}
                  onChange={(e) =>
                    updateField(
                      'sessionDurationMinutes',
                      Number(e.target.value)
                    )
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                >
                  <option value={60}>
                    1 hora
                  </option>

                  <option value={240}>
                    4 horas
                  </option>

                  <option value={480}>
                    8 horas
                  </option>

                  <option value={720}>
                    12 horas
                  </option>

                  <option value={1440}>
                    24 horas
                  </option>
                </select>
              </div>

            </div>

            <ToggleRow
              title="Exigir senha forte"
              description="Exige políticas adicionais para criação de senhas."
              checked={settings.requireStrongPassword}
              onChange={(value) =>
                updateField(
                  'requireStrongPassword',
                  value
                )
              }
            />

          </div>

        </section>

        {/* SISTEMA */}
        <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

          <div className="px-6 py-5 border-b border-slate-200">
            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-slate-600" />
              </div>

              <div>
                <h2 className="text-sm font-black text-slate-900">
                  Sistema
                </h2>

                <p className="text-xs text-slate-500 mt-0.5">
                  Controles globais de funcionamento.
                </p>
              </div>

            </div>
          </div>

          <div className="p-6 space-y-5">

            <ToggleRow
              title="Modo manutenção"
              description="Indica que a plataforma está em manutenção."
              checked={settings.maintenanceMode}
              onChange={(value) =>
                updateField(
                  'maintenanceMode',
                  value
                )
              }
              danger
            />

            <ToggleRow
              title="Permitir cadastro"
              description="Permite novos cadastros públicos na plataforma."
              checked={settings.allowRegistration}
              onChange={(value) =>
                updateField(
                  'allowRegistration',
                  value
                )
              }
            />

            <ToggleRow
              title="Notificações habilitadas"
              description="Ativa os recursos globais de notificações."
              checked={settings.notificationsEnabled}
              onChange={(value) =>
                updateField(
                  'notificationsEnabled',
                  value
                )
              }
            />

          </div>

        </section>

      </div>

      {/* INFORMAÇÃO DE SEGURANÇA */}
      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">

        <div className="flex items-start gap-3">

          <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-violet-600" />
          </div>

          <div>
            <p className="text-sm font-black text-violet-900">
              Configurações globais
            </p>

            <p className="text-xs text-violet-700 mt-1 leading-relaxed">
              Estas configurações pertencem à plataforma inteira
              e não a uma empresa específica. Alterações realizadas
              aqui poderão afetar todos os ambientes do FROTA CONTROL.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};

interface ToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  danger?: boolean;
}

interface ToggleRowProps {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  danger?: boolean;
}

const ToggleRow: React.FC<ToggleRowProps> = ({
  title,
  description,
  checked,
  onChange,
  danger = false,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 py-2">

      {/* TEXTO */}
      <div className="min-w-0">

        <p className="text-sm font-bold text-slate-800">
          {title}
        </p>

        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          {description}
        </p>

      </div>

      {/* TOGGLE */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={`
          relative
          shrink-0
          w-12
          h-7
          rounded-full
          transition-all
          duration-200
          ease-in-out
          focus:outline-none
          focus:ring-2
          focus:ring-violet-500/30
          ${
            checked
              ? danger
                ? 'bg-red-500'
                : 'bg-violet-600'
              : 'bg-slate-300'
          }
        `}
      >

        {/* INDICADOR */}
        <span
          className={`
            absolute
            top-1
            left-1
            w-5
            h-5
            rounded-full
            bg-white
            shadow-md
            transition-transform
            duration-200
            ease-in-out
            ${
              checked
                ? 'translate-x-5'
                : 'translate-x-0'
            }
          `}
        />

      </button>

    </div>
  );
};

export default SuperAdminSettingsPage;
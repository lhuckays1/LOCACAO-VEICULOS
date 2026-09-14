import React, { useEffect, useState } from 'react';

import {
  ArrowLeft,
  Building2,
  Users,
  Car,
  KeyRound,
  MapPin,
  Mail,
  Phone,
  FileText,
  Calendar,
  Pencil,
  MoreVertical,
  ShieldCheck,
  Activity,
  Settings,
  UserCog,
  CircleCheck,
  Loader2,
} from 'lucide-react';

import { api } from '../services/api';

type CompanyTab =
  | 'OVERVIEW'
  | 'USERS'
  | 'VEHICLES'
  | 'RENTALS'
  | 'SETTINGS';

interface CompanyDetailsPageProps {
  companyId: string;
  onBack: () => void;
}

interface Company {
  id: string;
  name: string;
  legalName?: string | null;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  logo?: string | null;
  status?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;

  metrics?: {
    users?: number;
    clients?: number;
    vehicles?: number;
    rentals?: number;
  };
}

const tabs: Array<{
  id: CompanyTab;
  label: string;
}> = [
  {
    id: 'OVERVIEW',
    label: 'Visão Geral',
  },
  {
    id: 'USERS',
    label: 'Usuários',
  },
  {
    id: 'VEHICLES',
    label: 'Veículos',
  },
  {
    id: 'RENTALS',
    label: 'Locações',
  },
  {
    id: 'SETTINGS',
    label: 'Configurações',
  },
];

export const CompanyDetailsPage: React.FC<CompanyDetailsPageProps> = ({
  companyId,
  onBack,
}) => {
  const [company, setCompany] = useState<Company | null>(null);

  const [activeTab, setActiveTab] =
    useState<CompanyTab>('OVERVIEW');

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCompany();
  }, [companyId]);

  const loadCompany = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await api.companies.getById(companyId);

      const companyData =
        response?.data?.data ||
        response?.data ||
        response;

      setCompany(companyData);
    } catch (err) {
      console.error(
        '[COMPANY DETAILS] Erro ao carregar empresa:',
        err
      );

      setError(
        'Não foi possível carregar os dados da empresa.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center">
        <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mb-4">
          <Loader2 className="w-7 h-7 text-violet-600 animate-spin" />
        </div>

        <p className="text-sm font-bold text-slate-500">
          Carregando informações da empresa...
        </p>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-violet-600 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para empresas
        </button>

        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-red-500" />
          </div>

          <h2 className="text-xl font-black text-slate-900">
            Empresa não encontrada
          </h2>

          <p className="text-sm text-slate-500 mt-2">
            {error ||
              'Não foi possível localizar esta empresa.'}
          </p>

          <button
            onClick={loadCompany}
            className="mt-6 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const metrics = company.metrics || {};

  const location = [company.city, company.state]
    .filter(Boolean)
    .join(' - ');

  const createdAt = company.createdAt
    ? new Date(company.createdAt).toLocaleDateString(
        'pt-BR'
      )
    : '-';

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-5">
        <button
          onClick={onBack}
          className="w-fit flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-violet-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />

          Voltar para empresas
        </button>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl bg-violet-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-violet-600" />
              </div>

              <span className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
                Gestão da Plataforma
              </span>
            </div>

            <h1 className="text-3xl font-black text-slate-900">
              {company.name}
            </h1>

            <p className="text-slate-500 mt-1">
              {company.legalName ||
                'Informações completas da empresa'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black ${
                company.active !== false
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              <CircleCheck className="w-4 h-4" />

              {company.active !== false
                ? 'EMPRESA ATIVA'
                : 'EMPRESA INATIVA'}
            </span>

            <button className="w-11 h-11 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center transition-colors">
              <MoreVertical className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>
      </div>

      {/* COMPANY HERO */}

      <div className="bg-gradient-to-r from-violet-700 via-violet-600 to-indigo-600 rounded-3xl p-7 lg:p-8 text-white shadow-xl shadow-violet-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-7">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/15 border border-white/20 backdrop-blur flex items-center justify-center">
              <Building2 className="w-10 h-10 text-white" />
            </div>

            <div>
              <h2 className="text-2xl font-black">
                {company.name}
              </h2>

              <p className="text-violet-100 text-sm mt-1">
                Ambiente operacional da empresa
              </p>

              <div className="flex flex-wrap gap-3 mt-4">
                <span className="text-xs font-bold bg-white/10 px-3 py-1.5 rounded-lg">
                  ID: {company.id.slice(0, 8)}
                </span>

                {location && (
                  <span className="text-xs font-bold bg-white/10 px-3 py-1.5 rounded-lg">
                    {location}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-violet-700 hover:bg-violet-50 font-black text-sm transition-colors">
            <Pencil className="w-4 h-4" />

            Editar Empresa
          </button>
        </div>
      </div>

      {/* TABS */}

      <div className="bg-white border border-slate-200 rounded-2xl p-2 overflow-x-auto">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* OVERVIEW */}

      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* METRICS */}

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <MetricCard
              label="Usuários"
              value={metrics.users || 0}
              description="Usuários cadastrados"
              icon={<Users className="w-6 h-6" />}
              iconClass="bg-violet-100 text-violet-600"
            />

            <MetricCard
              label="Veículos"
              value={metrics.vehicles || 0}
              description="Veículos gerenciados"
              icon={<Car className="w-6 h-6" />}
              iconClass="bg-blue-100 text-blue-600"
            />

            <MetricCard
              label="Clientes"
              value={metrics.clients || 0}
              description="Clientes cadastrados"
              icon={<UserCog className="w-6 h-6" />}
              iconClass="bg-emerald-100 text-emerald-600"
            />

            <MetricCard
              label="Locações"
              value={metrics.rentals || 0}
              description="Contratos registrados"
              icon={<KeyRound className="w-6 h-6" />}
              iconClass="bg-amber-100 text-amber-600"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* COMPANY INFO */}

            <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl">
              <div className="p-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-violet-600" />
                  </div>

                  <div>
                    <h3 className="font-black text-slate-900">
                      Informações da Empresa
                    </h3>

                    <p className="text-sm text-slate-500">
                      Dados cadastrais e informações de contato
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoItem
                  icon={<Building2 className="w-4 h-4" />}
                  label="Razão Social"
                  value={company.legalName || '-'}
                />

                <InfoItem
                  icon={<FileText className="w-4 h-4" />}
                  label="CNPJ"
                  value={company.document || '-'}
                />

                <InfoItem
                  icon={<Mail className="w-4 h-4" />}
                  label="E-mail"
                  value={company.email || '-'}
                />

                <InfoItem
                  icon={<Phone className="w-4 h-4" />}
                  label="Telefone"
                  value={company.phone || '-'}
                />

                <InfoItem
                  icon={<MapPin className="w-4 h-4" />}
                  label="Localização"
                  value={location || '-'}
                />

                <InfoItem
                  icon={<Calendar className="w-4 h-4" />}
                  label="Empresa cadastrada em"
                  value={createdAt}
                />
              </div>
            </div>

            {/* STATUS */}

            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-emerald-600" />
                </div>

                <div>
                  <h3 className="font-black text-slate-900">
                    Status Operacional
                  </h3>

                  <p className="text-xs text-slate-500">
                    Situação atual da empresa
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <StatusItem
                  label="Status da empresa"
                  value={
                    company.active !== false
                      ? 'Operacional'
                      : 'Inativa'
                  }
                  active={company.active !== false}
                />

                <StatusItem
                  label="Ambiente"
                  value="Produção"
                  active
                />

                <StatusItem
                  label="Acesso à plataforma"
                  value={
                    metrics.users && metrics.users > 0
                      ? 'Configurado'
                      : 'Pendente'
                  }
                  active={
                    !!metrics.users && metrics.users > 0
                  }
                />
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-bold text-slate-700 transition-colors">
                  <ShieldCheck className="w-4 h-4" />

                  Gerenciar Acessos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* USERS */}

      {activeTab === 'USERS' && (
        <EmptyModule
          icon={<Users className="w-8 h-8" />}
          title="Usuários da Empresa"
          description="Aqui será possível visualizar e gerenciar todos os usuários vinculados a esta empresa."
          actionLabel="Adicionar Usuário"
        />
      )}

      {/* VEHICLES */}

      {activeTab === 'VEHICLES' && (
        <EmptyModule
          icon={<Car className="w-8 h-8" />}
          title="Veículos da Empresa"
          description="Visualize os veículos cadastrados e acompanhe a situação operacional da frota."
          actionLabel="Ver Frota"
        />
      )}

      {/* RENTALS */}

      {activeTab === 'RENTALS' && (
        <EmptyModule
          icon={<KeyRound className="w-8 h-8" />}
          title="Locações da Empresa"
          description="Acompanhe contratos, locações ativas e histórico operacional."
          actionLabel="Ver Locações"
        />
      )}

      {/* SETTINGS */}

      {activeTab === 'SETTINGS' && (
        <EmptyModule
          icon={<Settings className="w-8 h-8" />}
          title="Configurações da Empresa"
          description="Gerencie as configurações administrativas e operacionais desta empresa."
          actionLabel="Configurar Empresa"
        />
      )}
    </div>
  );
};

interface MetricCardProps {
  label: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  iconClass: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  description,
  icon,
  iconClass,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">
            {label}
          </p>

          <p className="text-3xl font-black text-slate-900 mt-3">
            {value}
          </p>

          <p className="text-xs text-slate-500 mt-2">
            {description}
          </p>
        </div>

        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

const InfoItem: React.FC<InfoItemProps> = ({
  icon,
  label,
  value,
}) => {
  return (
    <div className="flex gap-3">
      <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p className="text-sm font-bold text-slate-700 mt-1 truncate">
          {value}
        </p>
      </div>
    </div>
  );
};

interface StatusItemProps {
  label: string;
  value: string;
  active: boolean;
}

const StatusItem: React.FC<StatusItemProps> = ({
  label,
  value,
  active,
}) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs text-slate-400">
          {label}
        </p>

        <p className="text-sm font-bold text-slate-700 mt-1">
          {value}
        </p>
      </div>

      <span
        className={`w-3 h-3 rounded-full ${
          active
            ? 'bg-emerald-500 shadow-lg shadow-emerald-200'
            : 'bg-amber-400'
        }`}
      />
    </div>
  );
};

interface EmptyModuleProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
}

const EmptyModule: React.FC<EmptyModuleProps> = ({
  icon,
  title,
  description,
  actionLabel,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-10">
      <div className="max-w-md mx-auto text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
          {icon}
        </div>

        <h2 className="text-xl font-black text-slate-900 mt-5">
          {title}
        </h2>

        <p className="text-sm text-slate-500 leading-relaxed mt-3">
          {description}
        </p>

        <button className="mt-6 px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-black transition-colors">
          {actionLabel}
        </button>
      </div>
    </div>
  );
};
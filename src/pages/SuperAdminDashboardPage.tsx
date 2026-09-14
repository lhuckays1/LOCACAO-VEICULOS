import React, { useEffect, useState } from 'react';
import {
  Building2,
  Users,
  Car,
  KeyRound,
  TrendingUp,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { api } from '../services/api';

interface SummaryData {
  companies: number;
  users: number;
  vehicles: number;
  rentals: number;
}

const initialSummary: SummaryData = {
  companies: 0,
  users: 0,
  vehicles: 0,
  rentals: 0,
};

/**
 * Converte diferentes formatos de resposta da API em número.
 *
 * Exemplos aceitos:
 * 10
 * "10"
 * { total: 10 }
 * { count: 10 }
 * { active: 10 }
 * { data: 10 }
 */
function extractNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;

    const possibleKeys = [
      'total',
      'count',
      'active',
      'value',
      'data',
      'quantity',
    ];

    for (const key of possibleKeys) {
      if (key in obj) {
        const result = extractNumber(obj[key]);

        if (result !== 0) {
          return result;
        }
      }
    }

    // Procura recursivamente por algum valor numérico
    for (const item of Object.values(obj)) {
      const result = extractNumber(item);

      if (result !== 0) {
        return result;
      }
    }
  }

  return 0;
}

function normalizeSummary(response: unknown): SummaryData {
  const responseObject =
    response && typeof response === 'object'
      ? (response as Record<string, unknown>)
      : {};

  // Algumas APIs retornam:
  // { data: { ... } }
  // outras:
  // { data: { summary: { ... } } }
  // outras:
  // { ... }
  const data =
    responseObject.data &&
    typeof responseObject.data === 'object'
      ? (responseObject.data as Record<string, unknown>)
      : responseObject;

  const summary =
    data.summary &&
    typeof data.summary === 'object'
      ? (data.summary as Record<string, unknown>)
      : data;

  return {
    companies: extractNumber(
      summary.companies ??
        summary.company ??
        summary.empresas
    ),

    users: extractNumber(
      summary.users ??
        summary.user ??
        summary.usuarios
    ),

    vehicles: extractNumber(
      summary.vehicles ??
        summary.vehicle ??
        summary.veiculos
    ),

    rentals: extractNumber(
      summary.rentals ??
        summary.rental ??
        summary.locacoes
    ),
  };
}

export const SuperAdminDashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<SummaryData>(initialSummary);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSummary() {
      try {
        const response = await api.companies.getSummary();

        console.log(
          '[SUPER ADMIN] Resposta completa da API:',
          response
        );

        const normalizedSummary = normalizeSummary(response);

        console.log(
          '[SUPER ADMIN] Resumo normalizado:',
          normalizedSummary
        );

        setSummary(normalizedSummary);
      } catch (error) {
        console.error(
          'Erro ao carregar resumo da plataforma:',
          error
        );

        setSummary(initialSummary);
      } finally {
        setLoading(false);
      }
    }

    loadSummary();
  }, []);

  const stats = [
    {
      label: 'EMPRESAS',
      value: summary.companies,
      icon: Building2,
      description: 'Empresas cadastradas',
    },
    {
      label: 'USUÁRIOS',
      value: summary.users,
      icon: Users,
      description: 'Usuários na plataforma',
    },
    {
      label: 'VEÍCULOS',
      value: summary.vehicles,
      icon: Car,
      description: 'Veículos gerenciados',
    },
    {
      label: 'LOCAÇÕES',
      value: summary.rentals,
      icon: KeyRound,
      description: 'Contratos registrados',
    },
  ];

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <Activity className="w-4 h-4 text-violet-600" />
            </div>

            <span className="text-xs font-bold tracking-widest uppercase text-violet-600">
              Administração Global
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Visão geral da plataforma
          </h1>

          <p className="text-sm text-slate-500 mt-2">
            Acompanhe todas as empresas e operações conectadas ao FROTA CONTROL.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-lg">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          Plataforma operacional
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-violet-200 hover:shadow-lg hover:shadow-slate-200/50 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black tracking-[0.15em] text-slate-400 uppercase">
                    {stat.label}
                  </p>

                  <div className="mt-3 text-3xl font-black text-slate-950">
                    {loading ? '...' : stat.value}
                  </div>

                  <p className="text-xs text-slate-500 mt-2">
                    {stat.description}
                  </p>
                </div>

                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-violet-600" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* STATUS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* CRESCIMENTO */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-black text-slate-900">
                Crescimento da Plataforma
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Indicadores globais das empresas cadastradas.
              </p>
            </div>

            <TrendingUp className="w-5 h-5 text-violet-500" />
          </div>

          <div className="h-52 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="w-10 h-10 text-violet-300 mx-auto mb-3" />

              <p className="text-sm font-bold text-slate-600">
                Métricas históricas
              </p>

              <p className="text-xs text-slate-400 mt-1">
                Disponível conforme novas empresas utilizarem a plataforma.
              </p>
            </div>
          </div>
        </div>

        {/* STATUS */}
        <div className="bg-slate-950 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-violet-400 font-bold uppercase tracking-wider">
                Status
              </p>

              <h2 className="text-lg font-black mt-2">
                Plataforma saudável
              </h2>
            </div>

            <ArrowUpRight className="w-5 h-5 text-violet-400" />
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-sm text-slate-400">
                Banco de dados
              </span>

              <span className="text-xs font-bold text-emerald-400">
                ONLINE
              </span>
            </div>

            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-sm text-slate-400">
                Multiempresa
              </span>

              <span className="text-xs font-bold text-emerald-400">
                ATIVO
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">
                Segurança RBAC
              </span>

              <span className="text-xs font-bold text-emerald-400">
                ATIVO
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
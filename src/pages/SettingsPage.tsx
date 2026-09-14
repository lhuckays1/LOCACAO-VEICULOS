import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { maskCNPJ, maskPhone, maskCEP } from '../utils/formatters';
import { Settings, Building2, Shield, CheckCircle2 } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, company } = useAuth();

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-emerald-600" />
            Configurações do Sistema & Locadora
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dados cadastrais da empresa, equipe de usuários, permissões de acesso RBAC e integrações com APIs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Company Profile (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                Dados Cadastrais da Locadora (Multi-Tenant)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Nome Fantasia</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{company?.name}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Razão Social</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">{company?.legalName}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">CNPJ</span>
                  <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                    {maskCNPJ(company?.document)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Telefone Principal</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {maskPhone(company?.phone)}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Endereço Matriz</span>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {company?.address} — {company?.city}/{company?.state} — CEP: {maskCEP(company?.zipCode)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fleet Standardization Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Diretrizes de Padronização & Cadastro da Frota
              </CardTitle>
              <p className="text-xs text-slate-500">
                Regras de integridade de dados e padronização cadastral aplicadas na gestão de veículos.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-900">
                      Modo Operacional: Cadastro Manual Completo
                    </span>
                  </div>
                  <Badge variant="success">ATIVO</Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="font-bold text-slate-800 uppercase text-[10px] block">
                      Padronização de Texto
                    </span>
                    <p className="text-slate-600 text-[11px]">
                      Conversão automática em MAIÚSCULAS para todos os campos textuais (marca, modelo, cor, motor, etc.) para uniformidade da base.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <span className="font-bold text-slate-800 uppercase text-[10px] block">
                      Validação de Placas
                    </span>
                    <p className="text-slate-600 text-[11px]">
                      Suporte e validação em tempo real para padrões Mercosul (ABC1D23) e Tradicional brasileiro (ABC-1234).
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Info & Security (1 col) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                Usuário Conectado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-sm">
                  {user?.name.charAt(0)}
                </div>
                <div>
                  <div className="font-black text-sm">{user?.name}</div>
                  <div className="text-slate-400 text-xs">{user?.email}</div>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Perfil de Acesso:</span>
                  <Badge variant="success" className="font-mono text-[10px]">
                    {user?.role}
                  </Badge>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px] space-y-1">
                <span className="font-bold text-slate-800 block uppercase">Regras de Acesso (RBAC)</span>
                <p>• <strong>ADMIN:</strong> Acesso total a todas as funções e exclusões.</p>
                <p>• <strong>MANAGER:</strong> Gestão de frota, precificação e equipe.</p>
                <p>• <strong>OPERATOR:</strong> Cadastro de clientes e emissão de locações.</p>
                <p>• <strong>FINANCIAL:</strong> Controle de pagamentos, faturamento e DRE.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

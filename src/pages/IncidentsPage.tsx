import React from 'react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { maskCurrency, formatDate } from '../utils/formatters';
import { ShieldAlert, Plus, ShieldCheck, Car } from 'lucide-react';

export const IncidentsPage: React.FC = () => {
  const dummyIncidents = [
    {
      id: '1',
      vehiclePlate: 'BRA2E19',
      clientName: 'CARLOS SILVA DE SOUZA',
      type: 'COLISÃO LEVE',
      description: 'AVARIA NO PARACHOQUE DIANTEIRO E FAROL ESQUERDO QUEBRADO EM ESTACIONAMENTO',
      date: '2024-02-20',
      claimNumber: 'SIN-889912',
      deductibleAmount: 1800,
      insurancePaid: 3200,
      status: 'EM REGULAÇÃO COM SEGURADORA',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-600" />
            Gestão de Sinistros, Colisões & Seguro
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro de ocorrências, boletins de acidente, cobrança de franquia do locatário e acionamento de apólices de seguro.
          </p>
        </div>

        <Button variant="primary" size="md" className="gap-2 font-bold shadow-xs">
          <Plus className="w-4 h-4" />
          Registrar Novo Sinistro
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Ocorrências e Sinistros</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Veículo / Placa</th>
                  <th className="px-4 py-3.5">Motorista Envolvido</th>
                  <th className="px-4 py-3.5">Tipo & Descrição</th>
                  <th className="px-4 py-3.5">Data Sinistro</th>
                  <th className="px-4 py-3.5">Nº Sinistro / Franquia</th>
                  <th className="px-4 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {dummyIncidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                      {inc.vehiclePlate}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-800">{inc.clientName}</td>
                    <td className="px-4 py-3.5 max-w-sm">
                      <div className="font-bold text-slate-900">{inc.type}</div>
                      <div className="text-slate-500 text-[11px] line-clamp-1">{inc.description}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{formatDate(inc.date)}</td>
                    <td className="px-4 py-3.5">
                      <div className="font-mono text-slate-900 font-bold">{inc.claimNumber}</div>
                      <div className="text-[10px] text-rose-600 font-semibold">
                        Franquia: {maskCurrency(inc.deductibleAmount)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="warning">{inc.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

import React from 'react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { maskCurrency, formatDate } from '../utils/formatters';
import { AlertOctagon, Plus, UserX, ShieldAlert } from 'lucide-react';

export const FinesPage: React.FC = () => {
  const dummyFines = [
    {
      id: '1',
      vehiclePlate: 'BRA2E19',
      clientName: 'CARLOS SILVA DE SOUZA',
      infractionCode: '7455-0',
      description: 'TRANSITAR EM VELOCIDADE SUPERIOR À MÁXIMA PERMITIDA EM ATÉ 20%',
      location: 'MARGINAL PINHEIROS KM 14 - SP',
      date: '2024-02-18 14:32',
      amount: 130.16,
      points: 4,
      driverIndicated: true,
      status: 'NOTIFICADO AO CONDUTOR',
    },
    {
      id: '2',
      vehiclePlate: 'ABC1234',
      clientName: 'MARCOS VINICIUS ANDRADE',
      infractionCode: '6050-3',
      description: 'AVANÇAR O SINAL VERMELHO DO SEMÁFORO OU O DE PARADA OBRIGATÓRIA',
      location: 'AV. BRIGADEIRO FARIA LIMA X REBOUÇAS',
      date: '2024-02-25 21:10',
      amount: 293.47,
      points: 7,
      driverIndicated: false,
      status: 'PENDENTE DE INDICAÇÃO',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <AlertOctagon className="w-6 h-6 text-rose-600" />
            Gestão de Multas & Infrações de Trânsito
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Identificação automática do motorista locatário na data da infração, indicação de real infrator e repasse de cobrança.
          </p>
        </div>

        <Button variant="primary" size="md" className="gap-2 font-bold shadow-xs">
          <Plus className="w-4 h-4" />
          Lançar Nova Multa
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Infrações Registradas na Frota</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Veículo / Placa</th>
                  <th className="px-4 py-3.5">Motorista no Período</th>
                  <th className="px-4 py-3.5">Descrição da Infração</th>
                  <th className="px-4 py-3.5">Local & Data</th>
                  <th className="px-4 py-3.5">Valor & Pontos</th>
                  <th className="px-4 py-3.5">Indicação Condutor</th>
                  <th className="px-4 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {dummyFines.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                      {f.vehiclePlate}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-800">{f.clientName}</td>
                    <td className="px-4 py-3.5 max-w-xs">
                      <div className="font-bold text-slate-900">{f.infractionCode}</div>
                      <div className="text-slate-500 text-[11px] line-clamp-1">{f.description}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      <div>{f.date}</div>
                      <div className="text-slate-400 text-[10px]">{f.location}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-rose-600">{maskCurrency(f.amount)}</span>
                      <span className="text-[10px] text-slate-400 block font-semibold">{f.points} pontos na CNH</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {f.driverIndicated ? (
                        <Badge variant="success">INDICADO</Badge>
                      ) : (
                        <Badge variant="danger">PENDENTE</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="warning">{f.status}</Badge>
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

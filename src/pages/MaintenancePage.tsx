import React from 'react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { maskCurrency, formatDate } from '../utils/formatters';
import { Wrench, Plus, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

export const MaintenancePage: React.FC = () => {
  const dummyMaintenances = [
    {
      id: '1',
      vehiclePlate: 'BRA2E19',
      vehicleModel: 'CHEVROLET ONIX 1.0 TURBO',
      type: 'PREVENTIVA',
      description: 'TROCA DE ÓLEO 5W30 SINTÉTICO, FILTRO DE ÓLEO, FILTRO DE AR E PASTILHAS DIANTEIRAS',
      workshop: 'AUTO CENTER PAULISTA',
      scheduledDate: '2024-03-12',
      cost: 480,
      status: 'SCHEDULED',
    },
    {
      id: '2',
      vehiclePlate: 'ABC1234',
      vehicleModel: 'FIAT ARGO 1.0 DRIVE',
      type: 'CORRETIVA',
      description: 'SUBSTITUIÇÃO DE 2 PNEUS 185/65 R15 DIANTEIROS + ALINHAMENTO E BALANCEAMENTO 3D',
      workshop: 'PNEUS & CIA ZONA SUL',
      scheduledDate: '2024-03-08',
      cost: 720,
      status: 'IN_PROGRESS',
    },
    {
      id: '3',
      vehiclePlate: 'RIO4F22',
      vehicleModel: 'HYUNDAI HB20 1.0 SENSE',
      type: 'REVISÃO 20.000 KM',
      description: 'REVISÃO PERIÓDICA CONCESSIONÁRIA COM CARIMBO DE MANUAL',
      workshop: 'CONCESSIONÁRIA HYUNDAI CAOA',
      scheduledDate: '2024-02-15',
      cost: 650,
      status: 'COMPLETED',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Wrench className="w-6 h-6 text-emerald-600" />
            Controle de Manutenção & Oficinas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ordens de serviço, manutenção preventiva, corretiva, trocas de óleo e revisões programadas por quilometragem.
          </p>
        </div>

        <Button variant="primary" size="md" className="gap-2 font-bold shadow-xs">
          <Plus className="w-4 h-4" />
          Nova Ordem de Serviço
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-amber-200 bg-amber-50/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-100 text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase text-amber-900">Agendadas</span>
              <div className="text-xl font-black text-slate-900">1 Manutenção</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-blue-200 bg-blue-50/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase text-blue-900">Em Execução</span>
              <div className="text-xl font-black text-slate-900">1 Veículo na Oficina</div>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-emerald-200 bg-emerald-50/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase text-emerald-900">Concluídas este mês</span>
              <div className="text-xl font-black text-slate-900">{maskCurrency(1850)}</div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ordens de Serviço Registradas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Veículo</th>
                  <th className="px-4 py-3.5">Tipo & Descrição</th>
                  <th className="px-4 py-3.5">Oficina Prestadora</th>
                  <th className="px-4 py-3.5">Data Agendada</th>
                  <th className="px-4 py-3.5">Custo Estimado</th>
                  <th className="px-4 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {dummyMaintenances.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold bg-slate-900 text-white px-2 py-0.5 rounded text-[11px]">
                        {m.vehiclePlate}
                      </span>
                      <div className="text-slate-500 text-[11px] mt-0.5">{m.vehicleModel}</div>
                    </td>
                    <td className="px-4 py-3.5 max-w-sm">
                      <div className="font-bold text-slate-900">{m.type}</div>
                      <div className="text-slate-500 text-[11px] line-clamp-1">{m.description}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">{m.workshop}</td>
                    <td className="px-4 py-3.5 text-slate-600">{formatDate(m.scheduledDate)}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">{maskCurrency(m.cost)}</td>
                    <td className="px-4 py-3.5">
                      <Badge variant={m.status as any}>{m.status}</Badge>
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

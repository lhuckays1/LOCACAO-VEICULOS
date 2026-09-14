import React from 'react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { formatDate } from '../utils/formatters';
import { ClipboardCheck, Plus, CheckCircle2, Camera, ShieldCheck } from 'lucide-react';

export const InspectionsPage: React.FC = () => {
  const dummyInspections = [
    {
      id: '1',
      rentalNumber: 'LOC-2024-0001',
      vehiclePlate: 'BRA2E19',
      clientName: 'CARLOS SILVA DE SOUZA',
      type: 'SAÍDA (CHECK-OUT)',
      date: '2024-03-01',
      mileage: 18450,
      fuel: 'CHEIO (1/1)',
      cleanliness: 'IMPECÁVEL',
      tires: 'BOM ESTADO (80%)',
      status: 'APROVADA',
    },
    {
      id: '2',
      rentalNumber: 'LOC-2024-0003',
      vehiclePlate: 'MER2026',
      clientName: 'JULIANA PEREIRA LIMA',
      type: 'ENTREGA (CHECK-IN)',
      date: '2024-02-28',
      mileage: 24200,
      fuel: '3/4',
      cleanliness: 'REGULAR',
      tires: 'BOM ESTADO',
      status: 'APROVADA COM RESSALVA',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-emerald-600" />
            Vistorias & Checklist Digital (Check-in / Check-out)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro fotográfico de lataria, estepe, macaco, nível de combustível, pneus e avarias na retirada e entrega.
          </p>
        </div>

        <Button variant="primary" size="md" className="gap-2 font-bold shadow-xs">
          <Plus className="w-4 h-4" />
          Nova Vistoria Digital
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Vistorias Realizadas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Contrato / Cliente</th>
                  <th className="px-4 py-3.5">Veículo</th>
                  <th className="px-4 py-3.5">Tipo de Vistoria</th>
                  <th className="px-4 py-3.5">Data / Hora</th>
                  <th className="px-4 py-3.5">KM & Combustível</th>
                  <th className="px-4 py-3.5">Condição Geral</th>
                  <th className="px-4 py-3.5">Parecer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {dummyInspections.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900">{i.rentalNumber}</div>
                      <div className="text-slate-500 text-[11px]">{i.clientName}</div>
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-slate-700">
                      {i.vehiclePlate}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-emerald-800">{i.type}</td>
                    <td className="px-4 py-3.5 text-slate-600">{formatDate(i.date)}</td>
                    <td className="px-4 py-3.5 text-slate-700">
                      {i.mileage} KM • {i.fuel}
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">
                      Limpeza: {i.cleanliness} • Pneus: {i.tires}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge variant="success">{i.status}</Badge>
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

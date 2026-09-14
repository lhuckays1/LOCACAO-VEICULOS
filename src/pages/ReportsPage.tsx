import React from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { BarChart3, Download, TrendingUp, Car, DollarSign, Calendar } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const reportsList = [
    {
      title: 'Relatório de Ocupação & Utilização da Frota',
      description: 'Taxa de dias alugados versus dias ociosos por placa, modelo e categoria.',
      category: 'OPERACIONAL',
    },
    {
      title: 'DRE & Rentabilidade Financeira por Veículo',
      description: 'Receita líquida obtida por veículo descontando manutenções, seguro e depreciação.',
      category: 'FINANCEIRO',
    },
    {
      title: 'Relatório de Inadimplência e Contas a Receber',
      description: 'Aging de pagamentos atrasados, contratos com bloqueio e histórico de devedores.',
      category: 'COBRANÇA',
    },
    {
      title: 'Previsão de Manutenções & Custo KM',
      description: 'Quilometragem acumulada, previsão de trocas de pneus, óleo e custo médio por KM rodado.',
      category: 'MANUTENÇÃO',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-600" />
            Relatórios Operacionais & Inteligência Executiva
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Exportação de dados consolidados em Excel, PDF e gráficos analíticos de desempenho da locadora.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {reportsList.map((rep, idx) => (
          <Card key={idx} className="hover:border-slate-300 transition-colors">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {rep.category}
                </span>
                <CardTitle className="mt-2 text-sm">{rep.title}</CardTitle>
                <p className="text-xs text-slate-500 mt-1">{rep.description}</p>
              </div>
            </CardHeader>
            <CardContent className="pt-0 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                <Download className="w-3.5 h-3.5" />
                Exportar CSV / Excel
              </Button>
              <Button variant="secondary" size="sm" className="text-xs gap-1.5">
                Visualizar Gráfico
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

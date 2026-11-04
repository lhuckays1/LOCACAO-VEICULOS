import React, { useCallback, useEffect, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { api } from '../../services/api';
import { useToast } from '../ui/Toast';
import { formatDate, maskCurrency } from '../../utils/formatters';
import { CalendarDays, CheckCircle2, ChevronDown, ChevronUp, CircleDollarSign, FilePenLine, Plus, RefreshCw, ShieldCheck } from 'lucide-react';

interface VehicleInsurancePanelProps {
  refreshToken?: number;
  onSettle: (transaction: any) => void;
}

const dateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dateInputValue = (value: string | Date) => typeof value === 'string' ? value.slice(0, 10) : dateValue(value);
const emptyForm = (categoryId = '') => {
  const now = new Date();
  return {
    vehicleId: '', insurerId: '', insurer: '', policyNumber: '', coverageType: 'COMPREENSIVA', installmentAmount: '', installmentCount: 1,
    startDate: dateValue(now), endDate: dateValue(new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())),
    firstDueDate: dateValue(now), categoryId, notes: '',
  };
};

const installmentStatusLabel: Record<string, string> = {
  PENDING: 'Pendente', OVERDUE: 'Em atraso', PARTIAL: 'Parcial', PAID: 'Paga', CANCELLED: 'Cancelada',
};

export const VehicleInsurancePanel: React.FC<VehicleInsurancePanelProps> = ({ refreshToken = 0, onSettle }) => {
  const { addToast } = useToast();
  const [policies, setPolicies] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [insurers, setInsurers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any | null>(null);
  const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(null);
  const [newInsurerOpen, setNewInsurerOpen] = useState(false);
  const [newInsurerName, setNewInsurerName] = useState('');
  const [newInsurerPhone, setNewInsurerPhone] = useState('');
  const [savingInsurer, setSavingInsurer] = useState(false);
  const [form, setForm] = useState<any>(() => emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [insurance, vehicleResponse, categoryResponse, insurerResponse] = await Promise.all([
        api.financial.getInsurances(), api.vehicles.list(), api.financial.getCategories('EXPENSE'), api.maintenance.listSuppliers(),
      ]);
      setPolicies(insurance.data);
      setVehicles(vehicleResponse.data);
      setCategories(categoryResponse.data);
      setInsurers(insurerResponse.data.filter((supplier: any) => supplier.ativo && supplier.tipo === 'OUTROS'));
    } catch (error: any) {
      addToast({ title: 'Não foi possível carregar os seguros', message: error?.message || 'Tente novamente.', type: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { void load(); }, [load, refreshToken]);

  const set = (key: string, value: any) => setForm((current: any) => ({ ...current, [key]: value }));

  const startCreate = () => {
    setEditingPolicy(null);
    setForm(emptyForm(categories[0]?.id || ''));
    setOpen(true);
  };

  const startEdit = (policy: any) => {
    const firstUnpaid = policy.financialTransactions?.find((transaction: any) => Number(transaction.paidAmount) === 0 && transaction.status !== 'CANCELLED');
    const amountCents = Math.round(Number(firstUnpaid?.grossAmount ?? policy.financialTransactions?.[0]?.grossAmount ?? Number(policy.totalPremium) / policy.installmentCount) * 100);
    setEditingPolicy(policy);
    setForm({
      vehicleId: policy.vehicleId, insurerId: insurers.find((item: any) => item.nome === policy.insurer)?.id || '', insurer: policy.insurer,
      policyNumber: policy.policyNumber, coverageType: policy.coverageType, installmentAmount: (amountCents / 100).toFixed(2),
      installmentCount: policy.installmentCount, startDate: dateInputValue(policy.startDate), endDate: dateInputValue(policy.endDate),
      firstDueDate: dateInputValue(policy.firstDueDate), categoryId: policy.financialTransactions?.find((item: any) => item.categoryId)?.categoryId || '', notes: policy.notes || '',
    });
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const selectedInsurer = insurers.find((insurer: any) => insurer.id === form.insurerId);
      const installmentAmountCents = Math.round(Number(form.installmentAmount) * 100);
      const installmentCount = Number(form.installmentCount);
      const totalPremium = installmentAmountCents * installmentCount / 100;
      const payload = { ...form, insurer: selectedInsurer?.nome || form.insurer, totalPremium, installmentCount, categoryId: form.categoryId || null };
      const result = editingPolicy
        ? await api.financial.updateInsurance(editingPolicy.id, payload)
        : await api.financial.createInsurance(payload);
      addToast({
        title: editingPolicy ? 'Seguro atualizado' : 'Seguro cadastrado',
        message: editingPolicy
          ? 'As parcelas pagas foram preservadas; as parcelas em aberto foram atualizadas.'
          : `${result.data.financialTransactions?.length || installmentCount} parcela(s) foram cadastradas.`,
        type: 'success',
      });
      setOpen(false);
      setEditingPolicy(null);
      await load();
    } catch (error: any) {
      addToast({ title: editingPolicy ? 'Não foi possível atualizar o seguro' : 'Não foi possível cadastrar o seguro', message: error?.message || 'Confira os dados.', type: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const saveInsurer = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingInsurer(true);
    try {
      const result = await api.maintenance.createSupplier({ nome: newInsurerName.trim(), tipo: 'OUTROS', telefone: newInsurerPhone.trim() });
      const insurer = result.data;
      setInsurers(current => [...current, insurer].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
      set('insurerId', insurer.id);
      setNewInsurerName('');
      setNewInsurerPhone('');
      setNewInsurerOpen(false);
      addToast({ title: 'Seguradora cadastrada', message: insurer.nome, type: 'success' });
    } catch (error: any) {
      addToast({ title: 'Não foi possível cadastrar a seguradora', message: error?.message || 'Confira os dados.', type: 'danger' });
    } finally {
      setSavingInsurer(false);
    }
  };

  const changeStatus = async (policy: any) => {
    const status = policy.status === 'ACTIVE' ? 'CANCELLED' : 'ACTIVE';
    if (status === 'CANCELLED' && !window.confirm('Cancelar esta apólice? As parcelas ainda não pagas também serão canceladas.')) return;
    try {
      await api.financial.updateInsuranceStatus(policy.id, status);
      addToast({ title: status === 'ACTIVE' ? 'Apólice reativada' : 'Apólice cancelada', message: '', type: 'success' });
      await load();
    } catch (error: any) {
      addToast({ title: 'Não foi possível atualizar a apólice', message: error?.message || 'Tente novamente.', type: 'danger' });
    }
  };

  const openSettlement = (policy: any, installment: any) => onSettle({
    ...installment,
    type: 'EXPENSE',
    origin: 'INSURANCE',
    description: installment.description || `Seguro ${policy.insurer} · ${policy.vehicle?.plate} · ${installment.installmentNumber}/${installment.totalInstallments}`,
    categoryName: 'Seguro de veículo',
    vehiclePlate: policy.vehicle?.plate,
    vehicleModel: `${policy.vehicle?.brand || ''} ${policy.vehicle?.model || ''}`.trim(),
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-indigo-600" />Seguros dos veículos</CardTitle>
            <p className="mt-1 text-sm text-slate-600">Consulte as apólices e registre o pagamento de cada parcela nesta tela.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Atualizar lista</Button>
            <Button variant="primary" size="sm" onClick={startCreate}><Plus className="h-4 w-4" />Cadastrar seguro</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? <p className="py-8 text-center text-slate-600">Carregando seguros…</p> : policies.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center">
              <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-slate-400" />
              <p className="font-semibold text-slate-800">Nenhum seguro cadastrado</p>
              <p className="mt-1 text-sm text-slate-600">Cadastre uma apólice para acompanhar as parcelas do veículo.</p>
              <Button className="mt-4" onClick={startCreate}><Plus className="h-4 w-4" />Cadastrar seguro</Button>
            </div>
          ) : policies.map(policy => {
            const installments = policy.financialTransactions || [];
            const paidCount = installments.filter((item: any) => item.status === 'PAID').length;
            const partialCount = installments.filter((item: any) => item.status === 'PARTIAL').length;
            const installmentValue = Number(installments[0]?.grossAmount ?? Number(policy.totalPremium) / Math.max(policy.installmentCount, 1));
            const expanded = expandedPolicyId === policy.id;
            return (
              <section key={policy.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{policy.vehicle?.plate || 'Veículo'}</p>
                      <p className="text-sm text-slate-600">{policy.vehicle?.brand} {policy.vehicle?.model}</p>
                      <p className="mt-1 text-sm text-slate-600">{policy.insurer} · {policy.coverageType}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Apólice {policy.policyNumber}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600"><CalendarDays className="h-4 w-4" />{formatDate(policy.startDate)} a {formatDate(policy.endDate)}</p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><CircleDollarSign className="h-4 w-4 text-emerald-700" />{maskCurrency(installmentValue)} por parcela</p>
                      <p className="mt-1 text-sm text-slate-600">{paidCount} pagas · {partialCount} parciais · {installments.length - paidCount - partialCount} em aberto</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={policy.status === 'ACTIVE' ? 'ACTIVE' : 'CANCELLED'}>{policy.status === 'ACTIVE' ? 'ATIVA' : 'CANCELADA'}</Badge>
                      <span className="text-sm text-slate-600">1º vencimento: {formatDate(policy.firstDueDate)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setExpandedPolicyId(expanded ? null : policy.id)} aria-expanded={expanded}>
                      {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {expanded ? 'Ocultar parcelas' : 'Ver parcelas'}
                    </Button>
                    {policy.status === 'ACTIVE' && <Button variant="outline" size="sm" onClick={() => startEdit(policy)}><FilePenLine className="h-4 w-4" />Editar seguro</Button>}
                    <Button variant={policy.status === 'ACTIVE' ? 'destructive' : 'outline'} size="sm" onClick={() => void changeStatus(policy)}>{policy.status === 'ACTIVE' ? 'Cancelar seguro' : 'Reativar seguro'}</Button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-slate-200 bg-slate-50 p-3 sm:p-4">
                    <h3 className="mb-3 text-base font-semibold text-slate-900">Parcelas do seguro</h3>
                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                      <table className="w-full min-w-[780px] text-left text-sm">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr><th className="px-3 py-3">Parcela</th><th className="px-3 py-3">Vencimento</th><th className="px-3 py-3">Valor</th><th className="px-3 py-3">Pago</th><th className="px-3 py-3">Saldo</th><th className="px-3 py-3">Situação</th><th className="px-3 py-3 text-right">Ação</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {installments.map((installment: any) => (
                            <tr key={installment.id}>
                              <td className="px-3 py-3 font-medium">{installment.installmentNumber} de {installment.totalInstallments}</td>
                              <td className="px-3 py-3">{formatDate(installment.dueDate)}</td>
                              <td className="px-3 py-3 font-semibold">{maskCurrency(installment.netAmount)}</td>
                              <td className="px-3 py-3">{maskCurrency(installment.paidAmount)}</td>
                              <td className="px-3 py-3">{maskCurrency(installment.remainingAmount)}</td>
                              <td className="px-3 py-3"><Badge variant={installment.status}>{installmentStatusLabel[installment.status] || installment.status}</Badge></td>
                              <td className="px-3 py-3 text-right">
                                {installment.remainingAmount > 0 && installment.status !== 'CANCELLED' ? (
                                  <Button size="sm" onClick={() => openSettlement(policy, installment)}><CheckCircle2 className="h-4 w-4" />Registrar pagamento</Button>
                                ) : <span className="text-sm text-slate-500">Sem ação</span>}
                              </td>
                            </tr>
                          ))}
                          {installments.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-600">Nenhuma parcela cadastrada.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </CardContent>
      </Card>

      <Modal isOpen={open} onClose={() => !saving && setOpen(false)} title={editingPolicy ? 'Editar seguro do veículo' : 'Cadastrar seguro do veículo'} description={editingPolicy ? 'Os pagamentos já registrados serão mantidos. Você pode incluir mais parcelas.' : 'Informe o valor cobrado por parcela; o sistema cria as contas a pagar do veículo.'} maxWidth="2xl">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Veículo *" value={form.vehicleId} onChange={event => set('vehicleId', event.target.value)} required disabled={Boolean(editingPolicy)}>
              <option value="">Selecione o veículo</option>{vehicles.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate} — {vehicle.brand} {vehicle.model}</option>)}
            </Select>
            <div className="flex items-end gap-2">
              <Select className="flex-1" label="Seguradora *" value={form.insurerId} onChange={event => set('insurerId', event.target.value)} required>
                <option value="">Selecione a seguradora</option>{insurers.map((insurer: any) => <option key={insurer.id} value={insurer.id}>{insurer.nome}</option>)}
              </Select>
              <Button type="button" variant="outline" onClick={() => setNewInsurerOpen(true)} aria-label="Cadastrar seguradora"><Plus className="h-5 w-5" /></Button>
            </div>
            <Input label="Número da apólice *" value={form.policyNumber} onChange={event => set('policyNumber', event.target.value)} required minLength={2} />
            <Input label="Tipo de cobertura *" value={form.coverageType} onChange={event => set('coverageType', event.target.value)} placeholder="Compreensiva, terceiros…" required />
            <Input label="Valor de cada parcela (R$) *" type="number" min="0.01" step="0.01" value={form.installmentAmount} onChange={event => set('installmentAmount', event.target.value)} required helperText="Use o valor que aparece na cobrança da seguradora. Não é necessário informar o custo total do seguro." />
            <Input label="Número de parcelas *" type="number" min={editingPolicy?.installmentCount || 1} max="60" value={form.installmentCount} onChange={event => set('installmentCount', event.target.value)} required helperText={editingPolicy ? `A quantidade atual é ${editingPolicy.installmentCount}. Você pode aumentá-la.` : 'Informe quantas parcelas estão previstas.'} />
            <Input label="Início da vigência *" type="date" value={form.startDate} onChange={event => set('startDate', event.target.value)} required />
            <Input label="Fim da vigência *" type="date" value={form.endDate} onChange={event => set('endDate', event.target.value)} required />
            <Input label="Vencimento da primeira parcela *" type="date" value={form.firstDueDate} onChange={event => set('firstDueDate', event.target.value)} required />
            <Select label="Categoria da despesa" value={form.categoryId} onChange={event => set('categoryId', event.target.value)}>
              <option value="">Sem categoria</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
            </Select>
          </div>
          <Input label="Observações" value={form.notes} onChange={event => set('notes', event.target.value)} />
          {editingPolicy && <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-950">Ao salvar, as parcelas em aberto serão atualizadas e as novas parcelas serão adicionadas. Parcelas pagas ou parcialmente pagas permanecem como foram registradas.</p>}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" variant="primary" isLoading={saving}>{editingPolicy ? 'Salvar alterações' : 'Salvar seguro'}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={newInsurerOpen} onClose={() => !savingInsurer && setNewInsurerOpen(false)} title="Cadastrar seguradora" description="Depois do cadastro, a seguradora ficará disponível para selecionar." maxWidth="md">
        <form onSubmit={saveInsurer} className="space-y-4">
          <Input label="Nome da seguradora *" value={newInsurerName} onChange={event => setNewInsurerName(event.target.value)} required minLength={3} placeholder="Ex.: Porto Seguro" />
          <Input label="Telefone *" value={newInsurerPhone} onChange={event => setNewInsurerPhone(event.target.value)} required minLength={8} placeholder="(11) 3333-4444" />
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => setNewInsurerOpen(false)} disabled={savingInsurer}>Cancelar</Button>
            <Button type="submit" variant="primary" isLoading={savingInsurer}>Cadastrar seguradora</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

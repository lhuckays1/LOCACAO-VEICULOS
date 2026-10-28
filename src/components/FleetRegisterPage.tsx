import React, { useEffect, useState } from 'react';
import { AlertTriangle, Car, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { Button } from './ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Badge } from './ui/Badge';
import { useToast } from './ui/Toast';
import { formatDate, maskCurrency } from '../utils/formatters';

type Kind = 'fines' | 'incidents';
type Props = { kind: Kind };
const today = () => new Date().toISOString().slice(0, 10);
const statuses: Record<Kind, [string, string][]> = {
  fines: [['PENDING', 'Pendente'], ['PAID', 'Paga'], ['REIMBURSED', 'Reembolsada'], ['CONTESTED', 'Em recurso']],
  incidents: [['REPORTED', 'Registrado'], ['UNDER_ANALYSIS', 'Em análise'], ['IN_REPAIR', 'Em reparo'], ['INSURANCE_CLAIMED', 'Acionado seguro'], ['RESOLVED', 'Resolvido']],
};
const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100';

export const FleetRegisterPage: React.FC<Props> = ({ kind }) => {
  const isFine = kind === 'fines';
  const { success, error } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [form, setForm] = useState<any>({ vehicleId: '', clientId: '', date: today(), dueDate: today(), location: '', description: '', amount: '', points: 0, type: 'COLISÃO', status: statuses[kind][0][0], notes: '' });
  const load = async () => {
    setLoading(true);
    try {
      const [data, vehicleData, clientData] = await Promise.all([api.fleetRecords.list(kind, { search, status: statusFilter }), api.vehicles.list(), api.clients.list()]);
      setRows(data.data); setVehicles(vehicleData.data); setClients(clientData.data);
    } catch (e: any) { error('Erro ao carregar registros', e?.message || 'Tente novamente.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [kind, search, statusFilter]);
  const set = (key: string, value: any) => setForm((old: any) => ({ ...old, [key]: value }));
  const startCreate = () => { setEditingId(null); setForm({ vehicleId: '', clientId: '', date: today(), dueDate: today(), location: '', description: '', amount: '', points: 0, type: 'COLISÃO', status: statuses[kind][0][0], notes: '' }); setOpen(true); };
  const startEdit = (row: any) => { setEditingId(row.id); setForm({ ...row, vehicleId: row.vehicleId, clientId: row.clientId || '', date: new Date(row.date).toISOString().slice(0, 10), dueDate: row.dueDate ? new Date(row.dueDate).toISOString().slice(0, 10) : today() }); setOpen(true); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true);
    try {
      const data = { ...form, clientId: form.clientId || null, ...(isFine ? { amount: Number(form.amount), points: Number(form.points) } : {}) };
      if (editingId) await api.fleetRecords.update(kind, editingId, data); else await api.fleetRecords.create(kind, data);
      success(isFine ? 'Multa salva' : 'Sinistro salvo', 'Registro gravado com sucesso.'); setOpen(false); await load();
    } catch (e: any) { error('Não foi possível salvar', e?.message || 'Confira os dados e tente novamente.'); }
    finally { setSaving(false); }
  };
  const remove = async (row: any) => {
    if (!window.confirm('Excluir este registro permanentemente?')) return;
    try { await api.fleetRecords.delete(kind, row.id); success('Registro excluído', ''); await load(); }
    catch (e: any) { error('Não foi possível excluir', e?.message || 'Tente novamente.'); }
  };
  const title = isFine ? 'Multas e infrações' : 'Sinistros e ocorrências';
  const moneyTotal = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return <div className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="flex items-center gap-2 text-xl font-black text-slate-900">{isFine ? <AlertTriangle className="h-6 w-6 text-amber-600"/> : <Car className="h-6 w-6 text-rose-600"/>}{title}</h1><p className="mt-1 text-xs text-slate-500">Registre, acompanhe e atualize os registros da frota.</p></div><div className="flex gap-2"><Button variant="outline" onClick={load} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}/>Atualizar</Button><Button variant="primary" onClick={startCreate}><Plus className="mr-2 h-4 w-4"/>Novo registro</Button></div></div>
    <div className="grid gap-3 sm:grid-cols-3"><Card><CardContent className="p-4"><p className="text-xs font-bold uppercase text-slate-500">Registros</p><b className="text-2xl">{rows.length}</b></CardContent></Card><Card><CardContent className="p-4"><p className="text-xs font-bold uppercase text-slate-500">Pendentes / ativos</p><b className="text-2xl">{rows.filter(row => isFine ? row.status === 'PENDING' : !['RESOLVED'].includes(row.status)).length}</b></CardContent></Card>{isFine&&<Card><CardContent className="p-4"><p className="text-xs font-bold uppercase text-slate-500">Valor listado</p><b className="text-2xl">{maskCurrency(moneyTotal)}</b></CardContent></Card>}</div>
    <Card><CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><CardTitle>{title} cadastrados</CardTitle><div className="flex gap-2"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input className={`${inputClass} pl-9`} value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar..."/></div><select className={inputClass} value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="ALL">Todos os status</option>{statuses[kind].map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{[isFine?'Data / vencimento':'Data','Veículo / cliente',isFine?'Infração':'Ocorrência',...(isFine?['Valor / pontos']:[]),'Status','Ações'].map(col=><th className="px-4 py-3" key={col}>{col}</th>)}</tr></thead><tbody className="divide-y">{loading?<tr><td className="p-8 text-center text-slate-500" colSpan={isFine?6:5}>Carregando...</td></tr>:rows.length===0?<tr><td className="p-8 text-center text-slate-500" colSpan={isFine?6:5}>Nenhum registro encontrado.</td></tr>:rows.map(row=><tr key={row.id}><td className="px-4 py-3">{formatDate(row.date)}{isFine&&<div className="text-xs text-slate-500">Venc. {formatDate(row.dueDate)}</div>}</td><td className="px-4 py-3"><b>{row.vehicle?.plate || '—'}</b><div className="text-xs text-slate-500">{row.client?.name || 'Sem cliente vinculado'}</div></td><td className="px-4 py-3"><b>{isFine?row.location:row.type}</b><div className="max-w-xs truncate text-xs text-slate-500">{row.description}</div></td>{isFine&&<td className="px-4 py-3">{maskCurrency(row.amount)}<div className="text-xs text-slate-500">{row.points} pontos</div></td>}<td className="px-4 py-3"><Badge variant={row.status}>{statuses[kind].find(([value])=>value===row.status)?.[1] || row.status}</Badge></td><td className="px-4 py-3"><div className="flex gap-1"><Button variant="outline" size="sm" onClick={()=>startEdit(row)}>Editar</Button><button onClick={()=>remove(row)} title="Excluir" className="rounded p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4"/></button></div></td></tr>)}</tbody></table></div></CardContent></Card>
    <Modal isOpen={open} onClose={()=>!saving&&setOpen(false)} title={`${editingId?'Editar':'Novo'} registro · ${isFine?'multa':'sinistro'}`} maxWidth="2xl"><form className="space-y-4" onSubmit={submit}><div className="grid gap-3 sm:grid-cols-2"><Select label="VEÍCULO" value={form.vehicleId} onChange={e=>set('vehicleId',e.target.value)} required><option value="">Selecione</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.plate} — {v.brand} {v.model}</option>)}</Select><Select label="CLIENTE / CONDUTOR" value={form.clientId} onChange={e=>set('clientId',e.target.value)}><option value="">Não vinculado</option>{clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</Select><Input label="DATA" type="date" value={form.date} onChange={e=>set('date',e.target.value)} required/>{isFine?<Input label="VENCIMENTO" type="date" value={form.dueDate} onChange={e=>set('dueDate',e.target.value)} required/>:<Select label="STATUS" value={form.status} onChange={e=>set('status',e.target.value)}>{statuses[kind].map(([value,label])=><option key={value} value={value}>{label}</option>)}</Select>}{isFine?<><Input label="LOCAL DA INFRAÇÃO" value={form.location} onChange={e=>set('location',e.target.value)} required minLength={2}/><Input label="VALOR (R$)" type="number" min="0.01" step="0.01" value={form.amount} onChange={e=>set('amount',e.target.value)} required/><Input label="PONTOS" type="number" min="0" value={form.points} onChange={e=>set('points',e.target.value)}/><Select label="STATUS" value={form.status} onChange={e=>set('status',e.target.value)}>{statuses[kind].map(([value,label])=><option key={value} value={value}>{label}</option>)}</Select></>:<Input label="TIPO DE SINISTRO" value={form.type} onChange={e=>set('type',e.target.value)} placeholder="Colisão, roubo, dano..." required minLength={2}/>}</div><label className="block text-xs font-semibold uppercase text-slate-700">DESCRIÇÃO<textarea className={`${inputClass} mt-1`} rows={3} value={form.description} onChange={e=>set('description',e.target.value)} required minLength={3}/></label><label className="block text-xs font-semibold uppercase text-slate-700">OBSERVAÇÕES<textarea className={`${inputClass} mt-1`} rows={2} value={form.notes||''} onChange={e=>set('notes',e.target.value)}/></label><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={()=>setOpen(false)}>Cancelar</Button><Button type="submit" variant="primary" isLoading={saving}>Salvar</Button></div></form></Modal>
  </div>;
};

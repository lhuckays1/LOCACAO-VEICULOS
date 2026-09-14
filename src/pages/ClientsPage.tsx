import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Client, ClientType } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { Skeleton } from '../components/ui/Skeleton';
import {
  maskCPF,
  maskCNPJ,
  maskCPFOrCNPJ,
  maskPhone,
  maskCEP,
  formatDate,
  validateCPF,
  validateCNPJ,
  unmask,
} from '../utils/formatters';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  AlertOctagon,
  Calendar,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface ClientsPageProps {
  isOpenCreateModal?: boolean;
  onCloseCreateModal?: () => void;
}

export const ClientsPage: React.FC<ClientsPageProps> = ({
  isOpenCreateModal = false,
  onCloseCreateModal,
}) => {
  const { success: toastSuccess, error: toastError } = useToast();

  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(isOpenCreateModal);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Detail Drawer / Modal State
  const [viewingClient, setViewingClient] = useState<any | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    type: 'PF' as ClientType,
    name: '',
    cpfCnpj: '',
    rg: '',
    birthDate: '',
    phone: '',
    whatsapp: '',
    email: '',
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: 'SÃO PAULO',
    state: 'SP',
    driverLicense: '',
    driverLicenseCategory: 'B (EAR)',
    driverLicenseExpiration: '',
    active: true,
    notes: '',
  });

  const [documentError, setDocumentError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpenCreateModal) {
      handleOpenCreate();
    }
  }, [isOpenCreateModal]);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const res = await api.clients.list({
        search: searchQuery,
        type: typeFilter,
        active: statusFilter === 'ALL' ? '' : statusFilter === 'ACTIVE',
      });
      setClients(res.data);
    } catch (err: any) {
      toastError('Erro ao carregar clientes', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [typeFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClients();
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedClientId(null);
    setDocumentError(null);
    setFormData({
      type: 'PF',
      name: '',
      cpfCnpj: '',
      rg: '',
      birthDate: '',
      phone: '',
      whatsapp: '',
      email: '',
      zipCode: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: 'SÃO PAULO',
      state: 'SP',
      driverLicense: '',
      driverLicenseCategory: 'B (EAR)',
      driverLicenseExpiration: '',
      active: true,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    setIsEditing(true);
    setSelectedClientId(client.id);
    setDocumentError(null);
    setFormData({
      type: client.type,
      name: client.name,
      cpfCnpj: client.type === 'PJ' ? maskCNPJ(client.cpfCnpj) : maskCPF(client.cpfCnpj),
      rg: client.rg || '',
      birthDate: client.birthDate ? client.birthDate.split('T')[0] : '',
      phone: maskPhone(client.phone),
      whatsapp: client.whatsapp ? maskPhone(client.whatsapp) : '',
      email: client.email,
      zipCode: maskCEP(client.zipCode),
      street: client.street,
      number: client.number,
      complement: client.complement || '',
      neighborhood: client.neighborhood,
      city: client.city,
      state: client.state,
      driverLicense: client.driverLicense || '',
      driverLicenseCategory: client.driverLicenseCategory || 'B',
      driverLicenseExpiration: client.driverLicenseExpiration ? client.driverLicenseExpiration.split('T')[0] : '',
      active: client.active,
      notes: client.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    if (onCloseCreateModal) onCloseCreateModal();
  };

  const handleOpenDetails = async (client: Client) => {
    try {
      setIsLoadingDetails(true);
      const res = await api.clients.getById(client.id);
      setViewingClient(res.data);
    } catch (err: any) {
      toastError('Erro ao buscar detalhes', err.message);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Real-time verification of CPF/CNPJ digits
  const handleDocumentChange = (val: string) => {
    let masked = val;
    if (formData.type === 'PF') {
      masked = maskCPF(val);
      const clean = unmask(masked);
      if (clean.length === 11) {
        if (!validateCPF(clean)) {
          setDocumentError('CPF inválido! Dígitos verificadores incorretos.');
        } else {
          setDocumentError(null);
        }
      } else {
        setDocumentError(null);
      }
    } else {
      masked = maskCNPJ(val);
      const clean = unmask(masked);
      if (clean.length === 14) {
        if (!validateCNPJ(clean)) {
          setDocumentError('CNPJ inválido! Dígitos verificadores incorretos.');
        } else {
          setDocumentError(null);
        }
      } else {
        setDocumentError(null);
      }
    }

    setFormData((prev) => ({ ...prev, cpfCnpj: masked }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanDoc = unmask(formData.cpfCnpj);
    if (formData.type === 'PF' && !validateCPF(cleanDoc)) {
      setDocumentError('CPF com dígitos verificadores inválidos.');
      toastError('CPF inválido', 'Verifique o número do CPF digitado.');
      return;
    }
    if (formData.type === 'PJ' && !validateCNPJ(cleanDoc)) {
      setDocumentError('CNPJ com dígitos verificadores inválidos.');
      toastError('CNPJ inválido', 'Verifique o número do CNPJ digitado.');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing && selectedClientId) {
        await api.clients.update(selectedClientId, formData);
        toastSuccess('Cliente atualizado com sucesso!');
      } else {
        await api.clients.create(formData);
        toastSuccess('Cliente cadastrado com sucesso!');
      }
      handleCloseModal();
      fetchClients();
    } catch (err: any) {
      toastError('Erro ao salvar cliente', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClient = async (client: Client) => {
    if (!confirm(`Deseja realmente desativar o cliente "${client.name}"?`)) return;

    try {
      await api.clients.delete(client.id);
      toastSuccess('Cliente desativado com sucesso.');
      fetchClients();
    } catch (err: any) {
      toastError('Erro ao desativar', err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            Gestão de Clientes & Motoristas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastro completo de pessoas físicas, jurídicas, motoristas de aplicativo e histórico de locações.
          </p>
        </div>

        <Button onClick={handleOpenCreate} variant="primary" size="md" className="gap-2 font-bold shadow-xs">
          <Plus className="w-4 h-4" />
          Novo Cliente
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por Nome, CPF/CNPJ, E-mail ou Telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Tipo: Todos</option>
                <option value="PF">Pessoa Física (PF)</option>
                <option value="PJ">Pessoa Jurídica (PJ)</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Status: Todos</option>
                <option value="ACTIVE">Apenas Ativos</option>
                <option value="INACTIVE">Inativos</option>
              </select>

              <Button type="submit" variant="secondary" size="sm" className="text-xs font-bold shrink-0">
                Filtrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : clients.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">Nenhum cliente encontrado</p>
              <p className="text-slate-400 mt-0.5">Tente ajustar seus termos de busca ou cadastre um novo cliente.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Cliente</th>
                    <th className="px-4 py-3.5">CPF / CNPJ</th>
                    <th className="px-4 py-3.5">Contato</th>
                    <th className="px-4 py-3.5">Localização</th>
                    <th className="px-4 py-3.5">Locações Ativas</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase border border-slate-200">
                            {client.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              {client.name}
                              <Badge variant={client.type} className="text-[10px] py-0 px-1.5">
                                {client.type}
                              </Badge>
                            </div>
                            <div className="text-slate-400 text-[11px] mt-0.5">{client.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-700">
                        {maskCPFOrCNPJ(client.cpfCnpj)}
                        {client.driverLicense && (
                          <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                            CNH: {client.driverLicense} ({client.driverLicenseCategory || 'B'})
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        <div>{maskPhone(client.phone)}</div>
                        {client.whatsapp && (
                          <div className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                            <span>WhatsApp:</span> {maskPhone(client.whatsapp)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        <div>{client.city} / {client.state}</div>
                        <div className="text-[10px] text-slate-400">{client.neighborhood}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-slate-800">
                          {client.activeRentalsCount || 0} ativa(s)
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Total: {client.totalRentalsCount || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {client.active ? (
                          <Badge variant="success">ATIVO</Badge>
                        ) : (
                          <Badge variant="default">INATIVO</Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetails(client)}
                            title="Ver Detalhes do Cliente"
                            className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(client)}
                            title="Editar Cliente"
                            className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClient(client)}
                            title="Desativar Cliente"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Client Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isEditing ? 'Editar Cliente' : 'Novo Cadastro de Cliente'}
        description="Preencha os dados cadastrais e documentos do cliente ou condutor."
        maxWidth="3xl"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Tipo de Cliente */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-700">Tipo de Cadastro:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setFormData((p) => ({ ...p, type: 'PF' }));
                  setDocumentError(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  formData.type === 'PF'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Pessoa Física (PF)
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData((p) => ({ ...p, type: 'PJ' }));
                  setDocumentError(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  formData.type === 'PJ'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Pessoa Jurídica (PJ)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={formData.type === 'PF' ? 'NOME COMPLETO' : 'RAZÃO SOCIAL / NOME'}
              placeholder="EX: LUCAS GABRIEL FERREIRA"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <div>
              <Input
                label={formData.type === 'PF' ? 'CPF (COM DIGITOS VERIFICADORES)' : 'CNPJ'}
                placeholder={formData.type === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                value={formData.cpfCnpj}
                onChange={(e) => handleDocumentChange(e.target.value)}
                error={documentError || undefined}
                required
              />
            </div>
          </div>

          {/* Sub-documents */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="RG / ÓRGÃO EXPEDIDOR"
              placeholder="EX: 48.912.431-8 SSP/SP"
              value={formData.rg}
              onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
            />

            <Input
              label="DATA DE NASCIMENTO"
              type="date"
              value={formData.birthDate}
              autoUppercase={false}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
            />

            <Input
              label="E-MAIL"
              type="email"
              placeholder="cliente@email.com"
              value={formData.email}
              autoUppercase={false}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="TELEFONE PRINCIPAL"
              placeholder="(11) 98765-4321"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: maskPhone(e.target.value) })}
              required
            />

            <Input
              label="WHATSAPP (NOTIFICAÇÕES)"
              placeholder="(11) 98765-4321"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: maskPhone(e.target.value) })}
            />
          </div>

          {/* Habilitação CNH */}
          <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-bold uppercase text-slate-800 tracking-wider">
              Carteira Nacional de Habilitação (CNH)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="NÚMERO DO REGISTRO CNH"
                placeholder="00000000000"
                value={formData.driverLicense}
                onChange={(e) => setFormData({ ...formData, driverLicense: e.target.value })}
              />
              <Input
                label="CATEGORIA CNH"
                placeholder="EX: B (EAR), AB, D"
                value={formData.driverLicenseCategory}
                onChange={(e) => setFormData({ ...formData, driverLicenseCategory: e.target.value })}
              />
              <Input
                label="VALIDADE DA CNH"
                type="date"
                value={formData.driverLicenseExpiration}
                autoUppercase={false}
                onChange={(e) => setFormData({ ...formData, driverLicenseExpiration: e.target.value })}
              />
            </div>
          </div>

          {/* Endereço */}
          <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-bold uppercase text-slate-800 tracking-wider">
              Endereço Residencial / Comercial
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="CEP"
                placeholder="00000-000"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: maskCEP(e.target.value) })}
                required
              />
              <div className="sm:col-span-2">
                <Input
                  label="LOGRADOURO (RUA / AV)"
                  placeholder="EX: AV. PAULISTA"
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <Input
                label="NÚMERO"
                placeholder="1000"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                required
              />
              <Input
                label="COMPLEMENTO"
                placeholder="APTO 42"
                value={formData.complement}
                onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
              />
              <Input
                label="BAIRRO"
                placeholder="BELA VISTA"
                value={formData.neighborhood}
                onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="CIDADE"
                  placeholder="SÃO PAULO"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  required
                />
                <Input
                  label="UF"
                  placeholder="SP"
                  maxLength={2}
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          <Input
            label="OBSERVAÇÕES INTERNAS DO CLIENTE"
            placeholder="EX: MOTORISTA DE APLICATIVO COM ÓTIMO HISTÓRICO, PREFERÊNCIA POR CARROS COMPACTOS..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving} className="font-bold">
              {isEditing ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Client Details View Modal */}
      {viewingClient && (
        <Modal
          isOpen={!!viewingClient}
          onClose={() => setViewingClient(null)}
          title={`Ficha do Cliente: ${viewingClient.name}`}
          description={`Cadastro nº ${viewingClient.id}`}
          maxWidth="4xl"
        >
          <div className="space-y-6">
            {/* Header info */}
            <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black">{viewingClient.name}</h3>
                  <Badge variant={viewingClient.type}>{viewingClient.type}</Badge>
                  {viewingClient.active ? (
                    <Badge variant="success">ATIVO</Badge>
                  ) : (
                    <Badge variant="default">INATIVO</Badge>
                  )}
                </div>
                <div className="text-xs text-slate-300 font-mono mt-1">
                  CPF/CNPJ: {maskCPFOrCNPJ(viewingClient.cpfCnpj)}
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700">
                  <span className="text-slate-400 block text-[10px]">LOCAÇÕES</span>
                  <span className="font-bold text-white text-sm">
                    {viewingClient.rentals?.length || 0} contrato(s)
                  </span>
                </div>
              </div>
            </div>

            {/* Grid with 3 sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Contato e Endereço */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <h4 className="font-bold uppercase text-slate-800 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  Contato & Endereço
                </h4>
                <div className="space-y-1 text-slate-600">
                  <p><strong>E-mail:</strong> {viewingClient.email}</p>
                  <p><strong>Telefone:</strong> {maskPhone(viewingClient.phone)}</p>
                  {viewingClient.whatsapp && (
                    <p><strong>WhatsApp:</strong> {maskPhone(viewingClient.whatsapp)}</p>
                  )}
                  <p>
                    <strong>Endereço:</strong> {viewingClient.street}, {viewingClient.number}{' '}
                    {viewingClient.complement && `(${viewingClient.complement})`} - {viewingClient.neighborhood},{' '}
                    {viewingClient.city}/{viewingClient.state} - CEP: {maskCEP(viewingClient.zipCode)}
                  </p>
                </div>
              </div>

              {/* Documentos & Habilitação */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <h4 className="font-bold uppercase text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Documentos & CNH
                </h4>
                <div className="space-y-1 text-slate-600">
                  <p><strong>RG:</strong> {viewingClient.rg || 'Não informado'}</p>
                  <p><strong>Nascimento:</strong> {formatDate(viewingClient.birthDate)}</p>
                  <p><strong>CNH:</strong> {viewingClient.driverLicense || 'Não informado'}</p>
                  <p><strong>Categoria CNH:</strong> {viewingClient.driverLicenseCategory || 'B'}</p>
                  <p><strong>Validade CNH:</strong> {formatDate(viewingClient.driverLicenseExpiration)}</p>
                </div>
              </div>
            </div>

            {/* Observações */}
            {viewingClient.notes && (
              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 text-xs text-amber-950">
                <strong>Observações:</strong> {viewingClient.notes}
              </div>
            )}

            {/* Histórico de Locações */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Histórico de Locações do Cliente
              </h4>
              {(!viewingClient.rentals || viewingClient.rentals.length === 0) ? (
                <div className="p-4 rounded-xl bg-slate-50 text-center text-slate-400 text-xs">
                  Nenhuma locação registrada para este cliente.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="px-4 py-2.5">Contrato</th>
                        <th className="px-4 py-2.5">Veículo</th>
                        <th className="px-4 py-2.5">Início</th>
                        <th className="px-4 py-2.5">Devolução</th>
                        <th className="px-4 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingClient.rentals.map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-bold">{r.rentalNumber}</td>
                          <td className="px-4 py-2.5">
                            {r.vehicle ? `${r.vehicle.brand} ${r.vehicle.model} (${r.vehicle.plate})` : 'N/A'}
                          </td>
                          <td className="px-4 py-2.5">{formatDate(r.startDate)}</td>
                          <td className="px-4 py-2.5">{formatDate(r.endDate)}</td>
                          <td className="px-4 py-2.5">
                            <Badge variant={r.status}>{r.status}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setViewingClient(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Search,
  Plus,
  Users,
  Car,
  KeyRound,
  MoreVertical,
  Pencil,
  Power,
  PowerOff,
  X,
  Save,
  Loader2,
  MapPin,
  Mail,
  Phone,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';

interface Company {
  id: string;
  name: string;
  legalName?: string | null;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  logo?: string | null;
  status?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
  metrics?: {
    users?: number;
    clients?: number;
    vehicles?: number;
    rentals?: number;
  };
}

interface CompanyFormData {
  name: string;
  legalName: string;
  document: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;

  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

const initialForm: CompanyFormData = {
  name: '',
  legalName: '',
  document: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',

  adminName: '',
  adminEmail: '',
  adminPassword: '',
};

function normalizeCompanies(response: any): Company[] {
  if (Array.isArray(response)) return response;

  if (Array.isArray(response?.data)) return response.data;

  if (Array.isArray(response?.data?.companies)) return response.data.companies;

  if (Array.isArray(response?.companies)) return response.companies;

  return [];
}

function getErrorMessage(error: any): string {
  return (
    error?.response?.data?.message ||
    error?.message ||
    'Ocorreu um erro inesperado.'
  );
}

export const SuperAdminCompaniesPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyFormData>(initialForm);

  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function loadCompanies() {
    try {
      setLoading(true);
      setError('');

      const response = await api.companies.list();

      console.log('[EMPRESAS] Resposta da API:', response);

      setCompanies(normalizeCompanies(response));
    } catch (err) {
      console.error('Erro ao carregar empresas:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  const filteredCompanies = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return companies;

    return companies.filter((company) => {
      return (
        company.name?.toLowerCase().includes(term) ||
        company.legalName?.toLowerCase().includes(term) ||
        company.document?.toLowerCase().includes(term) ||
        company.city?.toLowerCase().includes(term)
      );
    });
  }, [companies, search]);

  function openCreateModal() {
    setEditingCompany(null);
    setForm(initialForm);
    setError('');
    setShowModal(true);
  }

  function openEditModal(company: Company) {
    setEditingCompany(company);

    setForm({
      name: company.name || '',
      legalName: company.legalName || '',
      document: company.document || '',
      phone: company.phone || '',
      email: company.email || '',
      address: company.address || '',
      city: company.city || '',
      state: company.state || '',
      zipCode: company.zipCode || '',

      adminName: '',
      adminEmail: '',
      adminPassword: '',
    });

    setError('');
    setMenuOpen(null);
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingCompany(null);
    setForm(initialForm);
    setError('');
  }

  function updateField(field: keyof CompanyFormData, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');

      if (!form.name.trim()) {
        throw new Error('Informe o nome da empresa.');
      }

      if (!editingCompany) {
        if (!form.adminName.trim()) {
          throw new Error('Informe o nome do administrador.');
        }

        if (!form.adminEmail.trim()) {
          throw new Error('Informe o e-mail do administrador.');
        }

        if (!form.adminPassword.trim()) {
          throw new Error('Informe a senha inicial do administrador.');
        }

        const payload = {
          name: form.name,
          legalName: form.legalName || null,
          document: form.document || null,
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
          city: form.city || null,
          state: form.state || null,
          zipCode: form.zipCode || null,

          adminName: form.adminName,
          adminEmail: form.adminEmail,
          adminPassword: form.adminPassword,
        };

        console.log('[EMPRESAS] Criando empresa:', payload);

        await api.companies.create(payload);
      } else {
        const payload = {
          name: form.name,
          legalName: form.legalName || null,
          document: form.document || null,
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
          city: form.city || null,
          state: form.state || null,
          zipCode: form.zipCode || null,
        };

        /*
         * IMPORTANTE:
         * Caso o método update ainda não exista no api.ts,
         * vamos adicioná-lo na próxima etapa.
         */
        await api.companies.update(editingCompany.id, payload);
      }

      await loadCompanies();
      closeModal();
    } catch (err: any) {
      console.error('Erro ao salvar empresa:', err);
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleCompanyStatus(company: Company) {
    try {
      setMenuOpen(null);

      const action = company.active ? 'desativar' : 'ativar';

      const confirmed = window.confirm(
        `Deseja realmente ${action} a empresa "${company.name}"?`
      );

      if (!confirmed) return;

      /*
       * IMPORTANTE:
       * Caso toggleStatus ainda não exista no api.ts,
       * vamos adicioná-lo na próxima etapa.
       */
      await api.companies.toggleStatus(company.id);

      await loadCompanies();
    } catch (err) {
      console.error('Erro ao alterar status:', err);

      alert(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-violet-600" />
            </div>

            <span className="text-xs font-bold tracking-widest uppercase text-violet-600">
              Gestão da Plataforma
            </span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Empresas
          </h1>

          <p className="text-sm text-slate-500 mt-2">
            Gerencie todas as empresas cadastradas na plataforma.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700"
        >
          <Plus className="w-4 h-4" />
          Nova Empresa
        </button>
      </div>

      {/* SEARCH */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por empresa, CNPJ ou cidade..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-violet-400 focus:bg-white"
          />
        </div>
      </div>

      {/* ERROR */}
      {error && !showModal && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {/* CONTENT */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-64 rounded-2xl border border-slate-200 bg-slate-100 animate-pulse"
            />
          ))}
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />

          <h3 className="font-black text-slate-800">
            Nenhuma empresa encontrada
          </h3>

          <p className="text-sm text-slate-500 mt-2">
            Crie uma empresa para começar a utilizar a plataforma.
          </p>

          <button
            onClick={openCreateModal}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white"
          >
            <Plus className="w-4 h-4" />
            Criar primeira empresa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredCompanies.map((company) => (
            <div
              key={company.id}
              className="relative rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-violet-200 hover:shadow-xl hover:shadow-slate-200/60"
            >
              {/* TOP */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-violet-200">
                    <Building2 className="w-6 h-6" />
                  </div>

                  <div>
                    <h3 className="font-black text-slate-900 text-lg">
                      {company.name}
                    </h3>

                    {company.legalName && (
                      <p className="text-xs text-slate-500 mt-1">
                        {company.legalName}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black tracking-wide ${
                          company.active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            company.active
                              ? 'bg-emerald-500'
                              : 'bg-red-500'
                          }`}
                        />

                        {company.active ? 'ATIVA' : 'INATIVA'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* MENU */}
                <div className="relative">
                  <button
                    onClick={() =>
                      setMenuOpen(
                        menuOpen === company.id ? null : company.id
                      )
                    }
                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>

                  {menuOpen === company.id && (
                    <div className="absolute right-0 top-10 z-20 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                      <button
                        onClick={() => openEditModal(company)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="w-4 h-4" />
                        Editar empresa
                      </button>

                      <button
                        onClick={() => toggleCompanyStatus(company)}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-slate-50 ${
                          company.active
                            ? 'text-red-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        {company.active ? (
                          <>
                            <PowerOff className="w-4 h-4" />
                            Desativar empresa
                          </>
                        ) : (
                          <>
                            <Power className="w-4 h-4" />
                            Ativar empresa
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* DETAILS */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {company.document && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <FileText className="w-4 h-4 text-slate-400" />
                    {company.document}
                  </div>
                )}

                {(company.city || company.state) && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    {[company.city, company.state]
                      .filter(Boolean)
                      .join(' - ')}
                  </div>
                )}

                {company.email && (
                  <div className="flex items-center gap-2 text-slate-500 truncate">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{company.email}</span>
                  </div>
                )}

                {company.phone && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {company.phone}
                  </div>
                )}
              </div>

              {/* METRICS */}
              <div className="mt-6 grid grid-cols-3 gap-3 border-t border-slate-100 pt-5">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Users className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">
                      Usuários
                    </span>
                  </div>

                  <div className="mt-2 text-lg font-black text-slate-900">
                    {company.metrics?.users ?? 0}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Car className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">
                      Veículos
                    </span>
                  </div>

                  <div className="mt-2 text-lg font-black text-slate-900">
                    {company.metrics?.vehicles ?? 0}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">
                      Locações
                    </span>
                  </div>

                  <div className="mt-2 text-lg font-black text-slate-900">
                    {company.metrics?.rentals ?? 0}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {editingCompany
                    ? 'Editar Empresa'
                    : 'Cadastrar Nova Empresa'}
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  {editingCompany
                    ? 'Atualize os dados cadastrais da empresa.'
                    : 'Configure a empresa e seu administrador inicial.'}
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              {error && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </div>
              )}

              {/* EMPRESA */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-4 h-4 text-violet-600" />

                  <h3 className="font-black text-slate-900">
                    Dados da Empresa
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Nome da empresa *"
                    value={form.name}
                    onChange={(value) => updateField('name', value)}
                    placeholder="Ex: TE LEVO"
                  />

                  <FormInput
                    label="Razão social"
                    value={form.legalName}
                    onChange={(value) => updateField('legalName', value)}
                  />

                  <FormInput
                    label="CNPJ"
                    value={form.document}
                    onChange={(value) => updateField('document', value)}
                  />

                  <FormInput
                    label="Telefone"
                    value={form.phone}
                    onChange={(value) => updateField('phone', value)}
                  />

                  <FormInput
                    label="E-mail"
                    type="email"
                    value={form.email}
                    onChange={(value) => updateField('email', value)}
                  />

                  <FormInput
                    label="CEP"
                    value={form.zipCode}
                    onChange={(value) => updateField('zipCode', value)}
                  />

                  <div className="md:col-span-2">
                    <FormInput
                      label="Endereço"
                      value={form.address}
                      onChange={(value) => updateField('address', value)}
                    />
                  </div>

                  <FormInput
                    label="Cidade"
                    value={form.city}
                    onChange={(value) => updateField('city', value)}
                  />

                  <FormInput
                    label="Estado"
                    value={form.state}
                    onChange={(value) => updateField('state', value)}
                    placeholder="MG"
                  />
                </div>
              </section>

              {/* ADMIN */}
              {!editingCompany && (
                <section className="border-t border-slate-200 pt-7">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-violet-600" />

                    <div>
                      <h3 className="font-black text-slate-900">
                        Administrador Inicial
                      </h3>

                      <p className="text-xs text-slate-500 mt-1">
                        Este usuário terá acesso administrativo à empresa.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      label="Nome do administrador *"
                      value={form.adminName}
                      onChange={(value) => updateField('adminName', value)}
                    />

                    <FormInput
                      label="E-mail do administrador *"
                      type="email"
                      value={form.adminEmail}
                      onChange={(value) =>
                        updateField('adminEmail', value)
                      }
                    />

                    <div className="md:col-span-2">
                      <FormInput
                        label="Senha inicial *"
                        type="password"
                        value={form.adminPassword}
                        onChange={(value) =>
                          updateField('adminPassword', value)
                        }
                        placeholder="Mínimo recomendado: 8 caracteres"
                      />
                    </div>
                  </div>
                </section>
              )}

              {/* ACTIONS */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-slate-200 pt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 hover:bg-violet-700 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingCompany
                        ? 'Salvar Alterações'
                        : 'Criar Empresa'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface FormInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}

const FormInput: React.FC<FormInputProps> = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}) => {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-slate-600">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-50"
      />
    </div>
  );
};
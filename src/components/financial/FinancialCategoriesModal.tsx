import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { api } from '../../services/api';
import { useToast } from '../ui/Toast';
import { Plus, Trash2, Tag, Layers, Check } from 'lucide-react';

interface FinancialCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export const FinancialCategoriesModal: React.FC<FinancialCategoriesModalProps> = ({
  isOpen,
  onClose,
  onUpdated,
}) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'CATEGORIES' | 'COST_CENTERS'>('CATEGORIES');

  // Categories state
  const [categories, setCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [newCatColor, setNewCatColor] = useState('#EF4444');
  const [isAddingCat, setIsAddingCat] = useState(false);

  // Cost Centers state
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [newCcCode, setNewCcCode] = useState('');
  const [newCcName, setNewCcName] = useState('');
  const [newCcDesc, setNewCcDesc] = useState('');
  const [isAddingCc, setIsAddingCc] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [catRes, ccRes] = await Promise.all([
        api.financial.getCategories(),
        api.financial.getCostCenters(),
      ]);
      setCategories(catRes.data || []);
      setCostCenters(ccRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      setIsAddingCat(true);
      await api.financial.createCategory({
        name: newCatName.toUpperCase(),
        type: newCatType,
        color: newCatColor,
      });
      addToast({ title: 'SUCESSO', message: 'Categoria cadastrada com sucesso!', type: 'success' });
      setNewCatName('');
      loadData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      addToast({ title: 'ERRO', message: err.message || 'Falha ao criar categoria.', type: 'danger' });
    } finally {
      setIsAddingCat(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('Excluir esta categoria?')) return;
    try {
      await api.financial.deleteCategory(id);
      addToast({ title: 'EXCLUÍDO', message: 'Categoria removida.', type: 'success' });
      loadData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      addToast({ title: 'ERRO', message: err.message || 'Não foi possível excluir.', type: 'danger' });
    }
  };

  const handleAddCostCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCcCode.trim() || !newCcName.trim()) return;

    try {
      setIsAddingCc(true);
      await api.financial.createCostCenter({
        code: newCcCode.toUpperCase(),
        name: newCcName.toUpperCase(),
        description: newCcDesc ? newCcDesc.toUpperCase() : undefined,
      });
      addToast({ title: 'SUCESSO', message: 'Centro de custo cadastrado!', type: 'success' });
      setNewCcCode('');
      setNewCcName('');
      setNewCcDesc('');
      loadData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      addToast({ title: 'ERRO', message: err.message || 'Falha ao criar centro de custo.', type: 'danger' });
    } finally {
      setIsAddingCc(false);
    }
  };

  const handleDeleteCostCenter = async (id: string) => {
    if (!window.confirm('Excluir este centro de custo?')) return;
    try {
      await api.financial.deleteCostCenter(id);
      addToast({ title: 'EXCLUÍDO', message: 'Centro de custo removido.', type: 'success' });
      loadData();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      addToast({ title: 'ERRO', message: err.message || 'Não foi possível excluir.', type: 'danger' });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="CATEGORIAS & CENTROS DE CUSTO"
      description="Estruturação do plano de contas e centros de resultado da locadora."
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Sub-tabs */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('CATEGORIES')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'CATEGORIES'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Categorias Financeiras ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('COST_CENTERS')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'COST_CENTERS'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Centros de Custo ({costCenters.length})
          </button>
        </div>

        {activeTab === 'CATEGORIES' ? (
          <div className="space-y-4">
            {/* New Category Form */}
            <form onSubmit={handleAddCategory} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase block">Adicionar Nova Categoria</span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-5">
                  <Input
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value.toUpperCase())}
                    placeholder="NOME DA CATEGORIA"
                    required
                    className="text-xs"
                  />
                </div>
                <div className="sm:col-span-4">
                  <Select
                    value={newCatType}
                    onChange={(e) => {
                      const t = e.target.value as 'INCOME' | 'EXPENSE';
                      setNewCatType(t);
                      setNewCatColor(t === 'INCOME' ? '#10B981' : '#EF4444');
                    }}
                    className="text-xs"
                  >
                    <option value="EXPENSE">DESPESA</option>
                    <option value="INCOME">RECEITA</option>
                  </Select>
                </div>
                <div className="sm:col-span-1 flex items-center justify-center">
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0"
                    title="Escolha a cor da categoria"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" variant="primary" size="sm" disabled={isAddingCat} className="w-full text-xs gap-1">
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </form>

            {/* Categories List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {categories.map((c) => (
                <div key={c.id} className="p-2.5 px-3.5 flex items-center justify-between text-xs hover:bg-slate-50">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color || '#64748B' }} />
                    <div>
                      <span className="font-bold text-slate-900">{c.name}</span>
                      <span
                        className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          c.type === 'INCOME' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {c.type === 'INCOME' ? 'RECEITA' : 'DESPESA'}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCategory(c.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 h-7 w-7"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* New Cost Center Form */}
            <form onSubmit={handleAddCostCenter} className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase block">Adicionar Centro de Custo</span>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-3">
                  <Input
                    value={newCcCode}
                    onChange={(e) => setNewCcCode(e.target.value.toUpperCase())}
                    placeholder="CÓDIGO (EX: 1001)"
                    required
                    className="text-xs font-mono"
                  />
                </div>
                <div className="sm:col-span-4">
                  <Input
                    value={newCcName}
                    onChange={(e) => setNewCcName(e.target.value.toUpperCase())}
                    placeholder="NOME (EX: OPERAÇÃO)"
                    required
                    className="text-xs"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Input
                    value={newCcDesc}
                    onChange={(e) => setNewCcDesc(e.target.value.toUpperCase())}
                    placeholder="DESCRIÇÃO BREVE"
                    className="text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" variant="primary" size="sm" disabled={isAddingCc} className="w-full text-xs gap-1">
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar
                  </Button>
                </div>
              </div>
            </form>

            {/* Cost Centers List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {costCenters.map((cc) => (
                <div key={cc.id} className="p-2.5 px-3.5 flex items-center justify-between text-xs hover:bg-slate-50">
                  <div>
                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] mr-2">
                      {cc.code}
                    </span>
                    <span className="font-bold text-slate-900">{cc.name}</span>
                    {cc.description && <p className="text-[11px] text-slate-500 mt-0.5">{cc.description}</p>}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCostCenter(cc.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 h-7 w-7"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Car,
  KeyRound,
  CircleDollarSign,
  Wrench,
  ClipboardCheck,
  AlertOctagon,
  ShieldAlert,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Plus,
  Building2,
  Bell,
  Search,
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ChangePasswordModal } from '../components/auth/ChangePasswordModal';

export type NavigationTab =
  | 'DASHBOARD'
  | 'CLIENTES'
  | 'VEICULOS'
  | 'LOCACOES'
  | 'FINANCEIRO'
  | 'MANUTENCAO'
  | 'VISTORIAS'
  | 'MULTAS'
  | 'SINISTROS'
  | 'RELATORIOS'
  | 'CONFIGURACOES';

interface AppLayoutProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenNewRental?: () => void;
  onOpenNewVehicle?: () => void;
  onOpenNewClient?: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  onSelectTab,
  onOpenNewRental,
  onOpenNewVehicle,
  onOpenNewClient,
  children,
}) => {
  const { user, company, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  const navItems = [
    { id: 'DASHBOARD' as NavigationTab, label: 'DASHBOARD', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'CLIENTES' as NavigationTab, label: 'CLIENTES', icon: <Users className="w-4 h-4" /> },
    { id: 'VEICULOS' as NavigationTab, label: 'VEÍCULOS', icon: <Car className="w-4 h-4" /> },
    { id: 'LOCACOES' as NavigationTab, label: 'LOCAÇÕES', icon: <KeyRound className="w-4 h-4" /> },
    { id: 'FINANCEIRO' as NavigationTab, label: 'FINANCEIRO', icon: <CircleDollarSign className="w-4 h-4" /> },
    { id: 'MANUTENCAO' as NavigationTab, label: 'MANUTENÇÃO', icon: <Wrench className="w-4 h-4" /> },
    { id: 'VISTORIAS' as NavigationTab, label: 'VISTORIAS', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'MULTAS' as NavigationTab, label: 'MULTAS', icon: <AlertOctagon className="w-4 h-4" /> },
    { id: 'SINISTROS' as NavigationTab, label: 'SINISTROS', icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 'RELATORIOS' as NavigationTab, label: 'RELATÓRIOS', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'CONFIGURACOES' as NavigationTab, label: 'CONFIGURAÇÕES', icon: <Settings className="w-4 h-4" /> },
  ];

  const handleNavClick = (tab: NavigationTab) => {
    onSelectTab(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 antialiased font-sans">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-white text-sm shadow-xs">
            F
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wider leading-none">FROTA CRM</h1>
            <span className="text-[10px] text-emerald-400 font-medium">GESTÃO DE LOCAÇÃO</span>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 border-r border-slate-800/80 transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ height: '100vh' }}
      >
        {/* Top Logo & Company Section */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center font-black text-white shadow-md">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black tracking-wider text-white">FROTA</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  CRM
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mt-0.5" title={company?.name}>
                {company?.name || 'EMPRESA LOCADORA'}
              </p>
            </div>
          </div>

          {/* Company CNPJ Card */}
          <div className="mt-4 p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center gap-2 text-xs text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <div className="truncate min-w-0">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Ambiente Multiempresa</span>
              <span className="text-white font-medium text-[11px] truncate block">
                {company?.city || 'SÃO PAULO'} - {company?.state || 'SP'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom User Info & Actions */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/40">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-xs font-bold text-white truncate">
                  {user?.name || 'USUÁRIO'}
                </p>

                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />

                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    {user?.role || 'OPERATOR'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(true)}
                  title="Alterar senha"
                  className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <KeyRound className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={logout}
                  title="Sair do Sistema"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
      </aside>

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Desktop Navigation Bar */}
        <header className="hidden md:flex items-center justify-between h-16 px-8 bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
          {/* Active Tab Title / Breadcrumb */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">MÓDULO</span>
              <span className="text-slate-300">/</span>
              <h2 className="text-base font-black text-slate-900 tracking-tight uppercase">
                {currentTab}
              </h2>
            </div>
            <Badge variant="success" className="text-[10px] uppercase font-bold">
              Base Operacional Ativa
            </Badge>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            {onOpenNewClient && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenNewClient}
                className="gap-1.5 text-xs font-bold text-slate-700"
              >
                <Plus className="w-3.5 h-3.5 text-slate-500" />
                + Cliente
              </Button>
            )}

            {onOpenNewVehicle && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenNewVehicle}
                className="gap-1.5 text-xs font-bold text-slate-700"
              >
                <Car className="w-3.5 h-3.5 text-slate-500" />
                + Veículo
              </Button>
            )}

            {onOpenNewRental && (
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenNewRental}
                className="gap-1.5 text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Locação
              </Button>
            )}

            <div className="h-6 w-px bg-slate-200 mx-1" />

            {/* User Pill */}
            <div className="flex items-center gap-2.5 pl-1">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                {user?.name ? user.name.charAt(0) : 'U'}
              </div>
              <div className="text-left hidden lg:block">
                <span className="block text-xs font-bold text-slate-800 leading-tight truncate max-w-[140px]">
                  {user?.name}
                </span>
                <span className="block text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

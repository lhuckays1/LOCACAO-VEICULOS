import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Bell,
  RefreshCw,
} from 'lucide-react';

import { api } from '../services/api';

export type SuperAdminTab =
  | 'PLATFORM_DASHBOARD'
  | 'COMPANIES'
  | 'ADMINISTRATORS'
  | 'PLATFORM_SETTINGS';

interface SuperAdminLayoutProps {
  currentTab: SuperAdminTab;
  onSelectTab: (tab: SuperAdminTab) => void;
  children: React.ReactNode;
}

interface PlatformSettings {
  platformName: string;
  platformShortName: string;
  logo: string | null;
  supportEmail: string | null;
}

const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformName: 'FROTA CONTROL',
  platformShortName: 'FROTA',
  logo: null,
  supportEmail: null,
};

export const SuperAdminLayout: React.FC<
  SuperAdminLayoutProps
> = ({
  currentTab,
  onSelectTab,
  children,
}) => {
  const { user, logout } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false);

  const [platformSettings, setPlatformSettings] =
    useState<PlatformSettings>(
      DEFAULT_PLATFORM_SETTINGS
    );

  const [isLoadingBrand, setIsLoadingBrand] =
    useState(true);

  /**
   * ============================================================
   * CARREGAR IDENTIDADE DA PLATAFORMA
   * ============================================================
   */
  const loadPlatformSettings = async () => {
    try {
      const response =
        await api.superAdmin.getPlatformSettings();

      if (response?.data) {
        setPlatformSettings({
          ...DEFAULT_PLATFORM_SETTINGS,
          platformName:
            response.data.platformName ||
            DEFAULT_PLATFORM_SETTINGS.platformName,
          platformShortName:
            response.data.platformShortName ||
            DEFAULT_PLATFORM_SETTINGS.platformShortName,
          logo: response.data.logo || null,
          supportEmail:
            response.data.supportEmail || null,
        });
      }
    } catch (error) {
      console.error(
        'Erro ao carregar identidade da plataforma:',
        error
      );
    } finally {
      setIsLoadingBrand(false);
    }
  };

  useEffect(() => {
    loadPlatformSettings();
  }, []);

  /**
   * ============================================================
   * ATUALIZAÇÃO EM TEMPO REAL
   * ============================================================
   *
   * A tela de configurações dispara este evento depois de salvar.
   * Dessa forma, o nome da plataforma muda imediatamente no layout.
   */
  useEffect(() => {
    const handlePlatformSettingsUpdated = (
      event: Event
    ) => {
      const customEvent =
        event as CustomEvent<PlatformSettings>;

      if (!customEvent.detail) {
        return;
      }

      setPlatformSettings((current) => ({
        ...current,
        ...customEvent.detail,
      }));
    };

    window.addEventListener(
      'platform-settings-updated',
      handlePlatformSettingsUpdated
    );

    return () => {
      window.removeEventListener(
        'platform-settings-updated',
        handlePlatformSettingsUpdated
      );
    };
  }, []);

  const navItems = [
    {
      id: 'PLATFORM_DASHBOARD' as SuperAdminTab,
      label: 'VISÃO GERAL',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'COMPANIES' as SuperAdminTab,
      label: 'EMPRESAS',
      icon: <Building2 className="w-4 h-4" />,
    },
    {
      id: 'ADMINISTRATORS' as SuperAdminTab,
      label: 'ADMINISTRADORES',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'PLATFORM_SETTINGS' as SuperAdminTab,
      label: 'CONFIGURAÇÕES',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const handleNavClick = (
    tab: SuperAdminTab
  ) => {
    onSelectTab(tab);
    setIsMobileMenuOpen(false);
  };

  const currentTitle =
    navItems.find(
      (item) => item.id === currentTab
    )?.label || 'PLATAFORMA';

  /**
   * ============================================================
   * IDENTIDADE VISUAL
   * ============================================================
   */

  const platformName =
    platformSettings.platformName ||
    DEFAULT_PLATFORM_SETTINGS.platformName;

  const platformShortName =
    platformSettings.platformShortName ||
    DEFAULT_PLATFORM_SETTINGS.platformShortName;

  const platformLogo =
    platformSettings.logo;

  return (
    <div className="min-h-screen bg-slate-100 flex text-slate-900">

      {/* ====================================================== */}
      {/* MOBILE HEADER */}
      {/* ====================================================== */}

      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-16 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 text-white">

        <div className="flex items-center gap-3">

          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center overflow-hidden">

            {platformLogo ? (
              <img
                src={platformLogo}
                alt={platformName}
                className="w-full h-full object-cover"
              />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}

          </div>

          <div>

            <p className="font-black text-sm tracking-wide">
              {platformName}
            </p>

            <p className="text-[9px] uppercase tracking-widest text-slate-500">
              Administração da Plataforma
            </p>

          </div>

        </div>

        <button
          onClick={() =>
            setIsMobileMenuOpen(
              !isMobileMenuOpen
            )
          }
          className="p-2 rounded-lg hover:bg-slate-800"
        >
          {isMobileMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>

      </div>

      {/* ====================================================== */}
      {/* SIDEBAR */}
      {/* ====================================================== */}

      <aside
        className={`
          fixed md:sticky top-0 left-0 z-50
          w-72 h-screen
          bg-slate-950
          border-r border-slate-800
          flex flex-col
          transition-transform duration-200
          ${
            isMobileMenuOpen
              ? 'translate-x-0'
              : '-translate-x-full'
          }
          md:translate-x-0
        `}
      >

        {/* ================================================== */}
        {/* LOGO */}
        {/* ================================================== */}

        <div className="p-6 border-b border-slate-800">

          <div className="flex items-center gap-3">

            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 via-indigo-600 to-blue-700 flex items-center justify-center shadow-lg shadow-indigo-500/20 overflow-hidden">

              {platformLogo ? (
                <img
                  src={platformLogo}
                  alt={platformName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ShieldCheck className="w-6 h-6 text-white" />
              )}

            </div>

            <div className="min-w-0">

              <div className="flex items-center gap-1.5 flex-wrap">

                <span className="text-lg font-black tracking-tight text-white">
                  {isLoadingBrand
                    ? 'FROTA'
                    : platformName}
                </span>

                <span className="text-xs font-black px-1.5 py-0.5 rounded bg-violet-500/20 border border-violet-500/30 text-violet-400">
                  {isLoadingBrand
                    ? 'CONTROL'
                    : platformShortName}
                </span>

              </div>

              <p className="text-[10px] text-slate-500 uppercase tracking-[0.18em] font-bold mt-1">
                Administração da Plataforma
              </p>

            </div>

          </div>

        </div>

        {/* ================================================== */}
        {/* PLATFORM BADGE */}
        {/* ================================================== */}

        <div className="px-4 pt-5">

          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">

            <div className="flex items-center gap-2">

              <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-violet-400" />
              </div>

              <div>

                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">
                  Ambiente
                </p>

                <p className="text-xs font-bold text-violet-300">
                  SUPER ADMIN
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* ================================================== */}
        {/* NAVIGATION */}
        {/* ================================================== */}

        <nav className="flex-1 px-4 py-6 space-y-1">

          <p className="px-3 mb-3 text-[10px] font-bold tracking-[0.18em] text-slate-600 uppercase">
            Plataforma
          </p>

          {navItems.map((item) => {

            const isActive =
              currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() =>
                  handleNavClick(item.id)
                }
                className={`
                  w-full flex items-center gap-3
                  px-3 py-3 rounded-xl
                  text-xs font-bold tracking-wide
                  transition-all
                  ${
                    isActive
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }
                `}
              >

                {item.icon}

                <span>
                  {item.label}
                </span>

              </button>
            );

          })}

        </nav>

        {/* ================================================== */}
        {/* USER */}
        {/* ================================================== */}

        <div className="p-4 border-t border-slate-800">

          <div className="rounded-xl bg-slate-900 border border-slate-800 p-3">

            <div className="flex items-center gap-3">

              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-700 flex items-center justify-center text-sm font-black text-white">
                {user?.name?.charAt(0) || 'S'}
              </div>

              <div className="flex-1 min-w-0">

                <p className="text-xs font-bold text-white truncate">
                  {user?.name}
                </p>

                <p className="text-[10px] text-violet-400 font-bold uppercase mt-0.5">
                  Super Administrador
                </p>

              </div>

              <button
                onClick={logout}
                title="Sair"
                className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>

            </div>

          </div>

        </div>

      </aside>

      {/* ====================================================== */}
      {/* MAIN */}
      {/* ====================================================== */}

      <div className="flex-1 min-w-0 flex flex-col">

        {/* ================================================== */}
        {/* DESKTOP HEADER */}
        {/* ================================================== */}

        <header className="hidden md:flex h-16 bg-white border-b border-slate-200 items-center justify-between px-8 sticky top-0 z-30">

          <div>

            <div className="flex items-center gap-2">

              <span className="text-xs uppercase font-bold tracking-widest text-slate-400">
                Plataforma
              </span>

              <span className="text-slate-300">
                /
              </span>

              <h1 className="font-black text-slate-900 text-sm">
                {currentTitle}
              </h1>

            </div>

          </div>

          <div className="flex items-center gap-4">

            <button className="relative p-2 text-slate-400 hover:text-slate-700">
              <Bell className="w-5 h-5" />

              <span className="absolute top-1 right-1 w-2 h-2 bg-violet-500 rounded-full" />
            </button>

            <div className="h-6 w-px bg-slate-200" />

            <div className="flex items-center gap-2">

              <div className="w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold">
                {user?.name?.charAt(0)}
              </div>

              <div>

                <p className="text-xs font-bold text-slate-800">
                  {user?.name}
                </p>

                <p className="text-[9px] text-violet-600 font-bold uppercase">
                  SUPER ADMIN
                </p>

              </div>

            </div>

          </div>

        </header>

        {/* ================================================== */}
        {/* CONTENT */}
        {/* ================================================== */}

        <main className="flex-1 p-4 pt-20 md:pt-8 sm:p-6 md:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>

      </div>

    </div>
  );
};
import React, { useState } from 'react';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';

import { AppLayout, NavigationTab } from './layouts/AppLayout';
import { SuperAdminLayout, SuperAdminTab } from './layouts/SuperAdminLayout';

import { LoginPage } from './pages/LoginPage';

import { DashboardPage } from './pages/DashboardPage';
import { ClientsPage } from './pages/ClientsPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { RentalsPage } from './pages/RentalsPage';
import { FinancialPage } from './pages/FinancialPage';
import { MaintenancePage } from './pages/MaintenancePage';
import { InspectionsPage } from './pages/InspectionsPage';
import { FinesPage } from './pages/FinesPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

import { SuperAdminDashboardPage } from './pages/SuperAdminDashboardPage';
import { SuperAdminCompaniesPage } from './pages/SuperAdminCompaniesPage';
import { SuperAdminAdministratorsPage } from './pages/SuperAdminAdministratorsPage';
import { SuperAdminSettingsPage } from './pages/SuperAdminSettingsPage';

import { Car } from 'lucide-react';

const MainApp: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  const [currentTab, setCurrentTab] =
    useState<NavigationTab>('DASHBOARD');

  const [superAdminTab, setSuperAdminTab] =
    useState<SuperAdminTab>('PLATFORM_DASHBOARD');

  // Trigger modals from header/dashboard
  const [openClientModal, setOpenClientModal] = useState(false);
  const [openVehicleModal, setOpenVehicleModal] = useState(false);
  const [openRentalModal, setOpenRentalModal] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-xl animate-pulse mb-3">
          <Car className="w-6 h-6 text-white" />
        </div>

        <p className="text-sm font-bold tracking-wider text-slate-300">
          CARREGANDO FROTA CRM...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // ============================================================
  // SUPER ADMIN - PAINEL GLOBAL DA PLATAFORMA
  // ============================================================
  if (user?.role === 'SUPER_ADMIN') {
    return (
      <SuperAdminLayout
        currentTab={superAdminTab}
        onSelectTab={setSuperAdminTab}
      >
        {superAdminTab === 'PLATFORM_DASHBOARD' && (
          <SuperAdminDashboardPage />
        )}

        {superAdminTab === 'COMPANIES' && (
          <SuperAdminCompaniesPage />
        )}

        {superAdminTab === 'ADMINISTRATORS' && (
          <SuperAdminAdministratorsPage />
        )}

        {superAdminTab === 'PLATFORM_SETTINGS' && (
          <SuperAdminSettingsPage />
        )}
      </SuperAdminLayout>
    );
  }

  // ============================================================
  // ÁREA ADMINISTRATIVA DA EMPRESA
  // ============================================================

  const handleOpenNewRental = () => {
    setCurrentTab('LOCACOES');
    setOpenRentalModal(true);
  };

  const handleOpenNewVehicle = () => {
    setCurrentTab('VEICULOS');
    setOpenVehicleModal(true);
  };

  const handleOpenNewClient = () => {
    setCurrentTab('CLIENTES');
    setOpenClientModal(true);
  };

  return (
    <AppLayout
      currentTab={currentTab}
      onSelectTab={setCurrentTab}
      onOpenNewRental={handleOpenNewRental}
      onOpenNewVehicle={handleOpenNewVehicle}
      onOpenNewClient={handleOpenNewClient}
    >
      {currentTab === 'DASHBOARD' && (
        <DashboardPage
          onNavigate={setCurrentTab}
          onOpenNewRental={handleOpenNewRental}
          onOpenNewVehicle={handleOpenNewVehicle}
          onOpenNewClient={handleOpenNewClient}
        />
      )}

      {currentTab === 'CLIENTES' && (
        <ClientsPage
          isOpenCreateModal={openClientModal}
          onCloseCreateModal={() => setOpenClientModal(false)}
        />
      )}

      {currentTab === 'VEICULOS' && (
        <VehiclesPage
          isOpenCreateModal={openVehicleModal}
          onCloseCreateModal={() => setOpenVehicleModal(false)}
          onNavigateToRentals={() => setCurrentTab('LOCACOES')}
        />
      )}

      {currentTab === 'LOCACOES' && (
        <RentalsPage
          isOpenCreateModal={openRentalModal}
          onCloseCreateModal={() => setOpenRentalModal(false)}
        />
      )}

      {currentTab === 'FINANCEIRO' && <FinancialPage />}

      {currentTab === 'MANUTENCAO' && <MaintenancePage />}

      {currentTab === 'VISTORIAS' && <InspectionsPage />}

      {currentTab === 'MULTAS' && <FinesPage />}

      {currentTab === 'SINISTROS' && <IncidentsPage />}

      {currentTab === 'RELATORIOS' && <ReportsPage />}

      {currentTab === 'CONFIGURACOES' && <SettingsPage />}
    </AppLayout>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}
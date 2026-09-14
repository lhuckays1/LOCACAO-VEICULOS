import { hashPassword } from '../config/jwt.js';

export type Role = 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'FINANCIAL';
export type ClientType = 'PF' | 'PJ';
export type VehicleStatus = 'AVAILABLE' | 'RESERVED' | 'RENTED' | 'MAINTENANCE' | 'BLOCKED' | 'SOLD';
export type RentalStatus =
  | 'RASCUNHO'
  | 'AGENDADA'
  | 'ATIVA'
  | 'FINALIZADA'
  | 'CANCELADA'
  | 'ATRASADA'
  | 'DRAFT'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'OVERDUE'
  | 'BLOCKED';
export type BillingFrequency = 'DIARIA' | 'SEMANAL' | 'QUINZENAL' | 'MENSAL';
export type DepositStatus = 'PENDENTE' | 'PARCIAL' | 'RECEBIDA' | 'DEVOLVIDA';
export type RentalPaymentStatus = 'PENDENTE' | 'PAGO' | 'ATRASADO' | 'CANCELADO';
export type PaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'PARTIAL';
export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'WAITING_PARTS' | 'COMPLETED' | 'CANCELLED';
export type MaintenanceType =
  | 'PREVENTIVE'
  | 'CORRECTIVE'
  | 'EMERGENCY'
  | 'INSPECTION'
  | 'OIL_CHANGE'
  | 'TIRES'
  | 'BRAKES'
  | 'SUSPENSION'
  | 'ELECTRICAL'
  | 'ENGINE'
  | 'OTHER';
export type SupplierType = 'OFICINA' | 'PECAS' | 'SERVICOS' | 'OUTROS';

export type FinancialType = 'INCOME' | 'EXPENSE';
export type FinancialOrigin =
  | 'RENTAL'
  | 'EXTRA_FEE'
  | 'DAMAGE'
  | 'FINE'
  | 'MAINTENANCE'
  | 'FUEL'
  | 'INSURANCE'
  | 'ACQUISITION'
  | 'SALE'
  | 'SALARY'
  | 'TAX'
  | 'OFFICE'
  | 'OTHER';
export type FinancialStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED';
export type FinancialPaymentMethod =
  | 'PIX'
  | 'BOLETO'
  | 'CARTAO_CREDITO'
  | 'CARTAO_DEBITO'
  | 'DINHEIRO'
  | 'TRANSFERENCIA'
  | 'OUTRO';
export type RecurringFrequency = 'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'ANUAL';

export interface FinancialCategory {
  id: string;
  tenantId: string;
  companyId: string;
  name: string;
  type: FinancialType;
  description?: string | null;
  color?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CostCenter {
  id: string;
  tenantId: string;
  companyId: string;
  code: string;
  name: string;
  description?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialTransaction {
  id: string;
  tenantId: string;
  companyId: string;
  type: FinancialType;
  origin: FinancialOrigin;
  description: string;
  categoryId?: string | null;
  costCenterId?: string | null;
  clientId?: string | null;
  vehicleId?: string | null;
  rentalId?: string | null;
  rentalPaymentId?: string | null;
  maintenanceId?: string | null;
  recurringId?: string | null;

  grossAmount: number;
  discountAmount: number;
  interestAmount: number;
  netAmount: number;
  paidAmount: number;
  remainingAmount: number;

  competencyDate: string;
  dueDate: string;
  settlementDate?: string | null;
  paymentMethod?: FinancialPaymentMethod | null;
  status: FinancialStatus;

  isRecurring: boolean;
  installmentNumber?: number | null;
  totalInstallments?: number | null;
  receiptUrl?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialSettlement {
  id: string;
  tenantId: string;
  companyId: string;
  transactionId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: FinancialPaymentMethod;
  interest: number;
  fine: number;
  discount: number;
  receiptUrl?: string | null;
  notes?: string | null;
  userId?: string | null;
  createdAt: string;
}

export interface RecurringTransaction {
  id: string;
  tenantId: string;
  companyId: string;
  type: FinancialType;
  origin: FinancialOrigin;
  description: string;
  categoryId?: string | null;
  costCenterId?: string | null;
  clientId?: string | null;
  vehicleId?: string | null;
  amount: number;
  frequency: RecurringFrequency;
  dayOfDue: number;
  startDate: string;
  endDate?: string | null;
  active: boolean;
  lastGeneratedDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  legalName: string;
  document: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  logo?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  companyId: string;
  type: ClientType;
  name: string;
  cpfCnpj: string;
  rg?: string | null;
  birthDate?: string | null;
  phone: string;
  whatsapp?: string | null;
  email: string;
  zipCode: string;
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  driverLicense?: string | null;
  driverLicenseCategory?: string | null;
  driverLicenseExpiration?: string | null;
  active: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  companyId: string;
  plate: string;
  brand: string;
  model: string;
  version?: string | null;
  manufactureYear: number;
  modelYear: number;
  color: string;
  fuel: string;
  category: string;
  vehicleType?: string | null;
  renavam?: string | null;
  chassis?: string | null;
  engine?: string | null;
  currentMileage: number;
  power?: string | null;
  displacement?: string | null;
  passengerCapacity?: number | null;
  status: VehicleStatus;
  purchaseValue?: number | null;
  purchaseDate?: string | null;
  dailyRate: number;
  weeklyRate: number;
  biweeklyRate?: number | null;
  monthlyRate: number;
  mileageAllowance: number;
  excessMileageRate: number;
  nextMaintenanceDate?: string | null;
  insuranceProvider?: string | null;
  insuranceExpiration?: string | null;
  tracker?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleMileage {
  id: string;
  vehicleId: string;
  mileage: number;
  date: string;
  type: string;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Rental {
  id: string;
  tenantId: string;
  companyId: string;
  codigoContrato: string;
  rentalNumber: string;
  clienteId: string;
  clientId: string;
  veiculoId: string;
  vehicleId: string;

  // Período
  dataInicio: string;
  startDate: string;
  dataFimPrevista: string;
  endDate: string;
  dataFimReal?: string | null;
  actualEndDate?: string | null;

  // Cobrança
  tipoCobranca: BillingFrequency;
  billingFrequency: string;
  valorPeriodo: number;
  amount: number;
  diaVencimento: number;
  dueDay: number;
  quantidadePeriodos: number;

  // Caução
  valorCaucao: number;
  depositAmount: number;
  caucaoRecebida: number;
  statusCaucao: DepositStatus;

  // Quilometragem
  kmInicial: number;
  initialMileage: number;
  kmFinal?: number | null;
  finalMileage?: number | null;
  franquiaKm: number;
  mileageAllowance: number;
  valorKmExcedente: number;
  excessMileageRate: number;

  // Financeiro
  valorTotalPrevisto: number;
  desconto: number;
  acrescimos: number;
  valorFinal: number;

  // Status
  status: RentalStatus;

  // Outros
  initialFuelLevel?: string;
  finalFuelLevel?: string | null;
  observacoes?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RentalPayment {
  id: string;
  tenantId: string;
  rentalId: string;
  numeroParcela: number;
  descricao: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string | null;
  formaPagamento?: string | null;
  status: RentalPaymentStatus;
  observacoes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RentalInspection {
  id: string;
  tenantId: string;
  rentalId: string;
  tipo: 'SAIDA' | 'RETORNO';
  dataVistoria: string;
  km: number;
  nivelCombustivel: string;
  itensChecklist: { item: string; ok: boolean; observacao?: string }[];
  avariasIdentificadas: string[];
  fotosUrls?: string[];
  responsavelNome: string;
  observacoes?: string | null;
  statusAprovacao: 'APROVADO' | 'COM_RESSALVAS' | 'RECUSADO';
  createdAt: string;
}

export interface Contract {
  id: string;
  companyId: string;
  contractNumber: string;
  rentalId: string;
  status: string;
  terms: string;
  signedAt?: string | null;
  fileUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  companyId: string;
  rentalId?: string | null;
  dueDate: string;
  paidDate?: string | null;
  amount: number;
  paidAmount?: number | null;
  paymentMethod?: string | null;
  status: PaymentStatus;
  receiptUrl?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceService {
  id: string;
  maintenanceId: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenancePart {
  id: string;
  maintenanceId: string;
  nome: string;
  codigo?: string | null;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenancePlan {
  id: string;
  companyId: string;
  tenantId?: string;
  vehicleId?: string | null;
  nomeServico: string;
  descricao?: string | null;
  intervaloKm?: number | null;
  ultimaKm?: number | null;
  proximaKm?: number | null;
  intervaloDias?: number | null;
  ultimaData?: string | null;
  proximaData?: string | null;
  alertaKmFaltando?: number;
  alertaDiasFaltando?: number;
  status: 'ATIVO' | 'INATIVO';
  createdAt: string;
  updatedAt: string;
}

export interface Workshop {
  id: string;
  companyId: string;
  tenantId?: string;
  nome: string;
  cnpj?: string | null;
  telefone: string;
  email?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  uf?: string | null;
  observacoes?: string | null;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  companyId: string;
  tenantId?: string;
  nome: string;
  tipo: SupplierType;
  cpfCnpj?: string | null;
  telefone: string;
  email?: string | null;
  endereco?: string | null;
  observacoes?: string | null;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Maintenance {
  id: string;
  companyId: string;
  tenantId?: string;
  codigo: string;
  vehicleId: string;
  type: MaintenanceType;
  status: MaintenanceStatus;
  titulo: string;
  descricao: string;
  kmEntrada: number;
  kmConclusao?: number | null;
  dataAgendamento: string;
  dataInicio?: string | null;
  dataConclusao?: string | null;
  custoPecas: number;
  custoMaoDeObra: number;
  custoOutros: number;
  custoTotal: number;
  supplierId?: string | null;
  workshopId?: string | null;
  workshop?: string | null;
  financialTransactionId?: string | null;
  observacoes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;

  // Legacy/computed compatibility fields
  description?: string;
  scheduledDate?: string;
  completedDate?: string | null;
  mileage?: number;
  cost?: number;
  supplier?: string | null;
  nextMaintenanceDate?: string | null;
  nextMaintenanceMileage?: number | null;
  notes?: string | null;
}

export interface Fine {
  id: string;
  companyId: string;
  vehicleId: string;
  clientId?: string | null;
  date: string;
  location: string;
  description: string;
  amount: number;
  points: number;
  dueDate: string;
  status: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  companyId: string;
  vehicleId?: string | null;
  category: string;
  description: string;
  amount: number;
  date: string;
  dueDate?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  companyId: string;
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldData?: string | null;
  newData?: string | null;
  createdAt: string;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class InMemoryDatabase {
  companies: Company[] = [];
  users: User[] = [];
  clients: Client[] = [];
  vehicles: Vehicle[] = [];
  vehicleMileages: VehicleMileage[] = [];
  rentals: Rental[] = [];
  rentalPayments: RentalPayment[] = [];
  rentalInspections: RentalInspection[] = [];
  contracts: Contract[] = [];
  payments: Payment[] = [];
  maintenances: Maintenance[] = [];
  maintenanceServices: MaintenanceService[] = [];
  maintenanceParts: MaintenancePart[] = [];
  maintenancePlans: MaintenancePlan[] = [];
  workshops: Workshop[] = [];
  suppliers: Supplier[] = [];
  fines: Fine[] = [];
  expenses: Expense[] = [];
  auditLogs: AuditLog[] = [];
  financialCategories: FinancialCategory[] = [];
  costCenters: CostCenter[] = [];
  financialTransactions: FinancialTransaction[] = [];
  financialSettlements: FinancialSettlement[] = [];
  recurringTransactions: RecurringTransaction[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    const companyId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
    const now = new Date().toISOString();

    // 1. Initial Company
    this.companies.push({
      id: companyId,
      name: 'FROTA PRIME LOCADORA DE VEÍCULOS LTDA',
      legalName: 'FROTA PRIME LOCADORA DE VEÍCULOS LTDA',
      document: '45123987000185',
      phone: '1138549000',
      email: 'contato@frotaprime.com.br',
      address: 'AV. PAULISTA, 1842 - BELA VISTA',
      city: 'SÃO PAULO',
      state: 'SP',
      zipCode: '01310200',
      logo: null,
      active: true,
      createdAt: now,
      updatedAt: now,
    });

    // 2. Initial Users with varied roles
    const adminPasswordHash = hashPassword('admin123');
    this.users.push(
      {
        id: 'u-admin-1',
        companyId,
        name: 'CARLOS SILVA (ADMIN)',
        email: 'admin@frotacrm.com.br',
        password: adminPasswordHash,
        role: 'ADMIN',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'u-manager-1',
        companyId,
        name: 'MARIANA COSTA (GERENTE)',
        email: 'gerente@frotacrm.com.br',
        password: adminPasswordHash,
        role: 'MANAGER',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'u-operator-1',
        companyId,
        name: 'RODRIGO OLIVEIRA (OPERADOR)',
        email: 'operador@frotacrm.com.br',
        password: adminPasswordHash,
        role: 'OPERATOR',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'u-financial-1',
        companyId,
        name: 'BEATRIZ MENDES (FINANCEIRO)',
        email: 'financeiro@frotacrm.com.br',
        password: adminPasswordHash,
        role: 'FINANCIAL',
        active: true,
        createdAt: now,
        updatedAt: now,
      }
    );

    // 3. Initial Clients (valid CPF/CNPJs)
    const client1Id = 'c-101';
    const client2Id = 'c-102';
    const client3Id = 'c-103';

    this.clients.push(
      {
        id: client1Id,
        companyId,
        type: 'PF',
        name: 'LUCAS GABRIEL FERREIRA',
        cpfCnpj: '41852963078',
        rg: '48.912.431-8 SSP/SP',
        birthDate: '1992-05-14',
        phone: '11987654321',
        whatsapp: '11987654321',
        email: 'lucas.ferreira@gmail.com',
        zipCode: '04571010',
        street: 'AV. ENGENHEIRO LUÍS CARLOS BERRINI',
        number: '1000',
        complement: 'APTO 42',
        neighborhood: 'CIDADE MONÇÕES',
        city: 'SÃO PAULO',
        state: 'SP',
        driverLicense: '05481239841',
        driverLicenseCategory: 'B (EAR)',
        driverLicenseExpiration: '2028-11-20',
        active: true,
        notes: 'MOTORISTA DE APLICATIVO UBER BLACK E 99POP. EXCELENTE HISTÓRICO.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: client2Id,
        companyId,
        type: 'PF',
        name: 'JULIANA ALVES DOS SANTOS',
        cpfCnpj: '15975346820',
        rg: '32.145.987-1 SSP/RJ',
        birthDate: '1988-09-22',
        phone: '21971234567',
        whatsapp: '21971234567',
        email: 'juliana.santos@outlook.com',
        zipCode: '22041001',
        street: 'AVENIDA ATLÂNTICA',
        number: '2500',
        complement: null,
        neighborhood: 'COPACABANA',
        city: 'RIO DE JANEIRO',
        state: 'RJ',
        driverLicense: '09871234561',
        driverLicenseCategory: 'AB',
        driverLicenseExpiration: '2027-04-15',
        active: true,
        notes: 'LOCAÇÃO PARTICULAR PARA VIAGENS E USO DIÁRIO.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: client3Id,
        companyId,
        type: 'PJ',
        name: 'TRANSEXPRESS LOGÍSTICA & ENTREGAS LTDA',
        cpfCnpj: '12345678000195',
        rg: null,
        birthDate: null,
        phone: '1132001122',
        whatsapp: '11998877665',
        email: 'frotas@transexpress.com.br',
        zipCode: '07190000',
        street: 'RODOVIA PRESIDENTE DUTRA',
        number: 'KM 220',
        complement: 'GALPÃO 4',
        neighborhood: 'PORTO DA IGREJA',
        city: 'GUARULHOS',
        state: 'SP',
        driverLicense: null,
        driverLicenseCategory: null,
        driverLicenseExpiration: null,
        active: true,
        notes: 'CONTRATO CORPORATIVO DE 3 VEÍCULOS PARA SUPERVISÃO DE CAMPO.',
        createdAt: now,
        updatedAt: now,
      }
    );

    // 4. Initial Vehicles
    const v1Id = 'v-201';
    const v2Id = 'v-202';
    const v3Id = 'v-203';
    const v4Id = 'v-204';
    const v5Id = 'v-205';
    const v6Id = 'v-206';

    this.vehicles.push(
      {
        id: v1Id,
        companyId,
        plate: 'BRA2E19',
        brand: 'CHEVROLET',
        model: 'ONIX',
        version: '1.0 TURBO LT MANUAL',
        manufactureYear: 2024,
        modelYear: 2024,
        color: 'PRATA',
        fuel: 'FLEX',
        renavam: '12485963214',
        chassis: '9BG118745P9128374',
        category: 'HATCH COMPACTO',
        currentMileage: 28450,
        status: 'RENTED',
        purchaseValue: 86900.0,
        purchaseDate: '2024-01-15',
        dailyRate: 120.0,
        weeklyRate: 700.0,
        biweeklyRate: 1350.0,
        monthlyRate: 2400.0,
        mileageAllowance: 4000,
        excessMileageRate: 0.50,
        nextMaintenanceDate: '2026-10-15',
        insuranceProvider: 'PORTO SEGURO AUTO',
        insuranceExpiration: '2027-01-14',
        tracker: 'ITURAN RASTREADOR GPS - IMEI 865421098451234',
        notes: 'VEÍCULO IMPECÁVEL, COM RASTREADOR ATIVO E BLOQUEIO REMOTO.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: v2Id,
        companyId,
        plate: 'RIO4F22',
        brand: 'HYUNDAI',
        model: 'HB20',
        version: '1.0 COMFORT PLUS',
        manufactureYear: 2023,
        modelYear: 2024,
        color: 'BRANCO',
        fuel: 'FLEX',
        renavam: '98451236547',
        chassis: '9BH458124N8291034',
        category: 'HATCH COMPACTO',
        currentMileage: 41200,
        status: 'AVAILABLE',
        purchaseValue: 79900.0,
        purchaseDate: '2023-06-20',
        dailyRate: 110.0,
        weeklyRate: 650.0,
        biweeklyRate: 1250.0,
        monthlyRate: 2300.0,
        mileageAllowance: 4000,
        excessMileageRate: 0.50,
        nextMaintenanceDate: '2026-11-01',
        insuranceProvider: 'TOKIO MARINE',
        insuranceExpiration: '2026-12-30',
        tracker: 'SASCAR TELEMETRIA - ATIVO',
        notes: 'REVISÃO DE 40.000 KM REALIZADA RECENTEMENTE.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: v3Id,
        companyId,
        plate: 'ABC1234',
        brand: 'VOLKSWAGEN',
        model: 'GOL',
        version: '1.0 MPI TOTALFLEX',
        manufactureYear: 2022,
        modelYear: 2023,
        color: 'PRETO',
        fuel: 'FLEX',
        renavam: '45127896325',
        chassis: '9BW115478M7123984',
        category: 'HATCH COMPACTO',
        currentMileage: 74800,
        status: 'MAINTENANCE',
        purchaseValue: 64000.0,
        purchaseDate: '2022-09-10',
        dailyRate: 95.0,
        weeklyRate: 580.0,
        biweeklyRate: 1100.0,
        monthlyRate: 1950.0,
        mileageAllowance: 5000,
        excessMileageRate: 0.45,
        nextMaintenanceDate: '2026-09-10',
        insuranceProvider: 'AZUL SEGUROS',
        insuranceExpiration: '2026-10-15',
        tracker: 'AUTOTRAC COM TELEMETRIA',
        notes: 'EM MANUTENÇÃO: TROCA DE PASTILHAS DE FREIO E DISCOS DIANTEIROS.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: v4Id,
        companyId,
        plate: 'XYZ9876',
        brand: 'FIAT',
        model: 'MOBI',
        version: '1.0 LIKE FLEX',
        manufactureYear: 2023,
        modelYear: 2023,
        color: 'VERMELHO',
        fuel: 'FLEX',
        renavam: '78451296358',
        chassis: '9BD124785L6129845',
        category: 'SUBCOMPACTO',
        currentMileage: 33100,
        status: 'AVAILABLE',
        purchaseValue: 62500.0,
        purchaseDate: '2023-04-12',
        dailyRate: 90.0,
        weeklyRate: 550.0,
        biweeklyRate: 1050.0,
        monthlyRate: 1850.0,
        mileageAllowance: 3500,
        excessMileageRate: 0.40,
        nextMaintenanceDate: '2026-12-05',
        insuranceProvider: 'ALLIANZ SEGUROS',
        insuranceExpiration: '2027-04-10',
        tracker: 'POSSUI BLOQUEADOR VIA APP',
        notes: 'ECONÔMICO E ÁGIL. IDEAL PARA ENTREGAS RÁPIDAS OU MOTORISTAS INICIANTES.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: v5Id,
        companyId,
        plate: 'MER2026',
        brand: 'JEEP',
        model: 'COMPASS',
        version: '1.3 LONGITUDE TURBO T270',
        manufactureYear: 2024,
        modelYear: 2025,
        color: 'CINZA',
        fuel: 'FLEX',
        renavam: '36985214785',
        chassis: '988547896P9321456',
        category: 'SUV MEDIO',
        currentMileage: 12500,
        status: 'AVAILABLE',
        purchaseValue: 178000.0,
        purchaseDate: '2024-03-01',
        dailyRate: 250.0,
        weeklyRate: 1500.0,
        biweeklyRate: 2900.0,
        monthlyRate: 5200.0,
        mileageAllowance: 3000,
        excessMileageRate: 0.80,
        nextMaintenanceDate: '2027-03-01',
        insuranceProvider: 'BRADESCO SEGUROS AUTO',
        insuranceExpiration: '2027-02-28',
        tracker: 'SISTEMA ADVENTURE INTELLIGENCE INTEGRADO',
        notes: 'VEÍCULO PREMIUM EXECUTIVO COM BANCOS EM COURO E TETO SOLAR.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: v6Id,
        companyId,
        plate: 'LOC1A23',
        brand: 'TOYOTA',
        model: 'COROLLA',
        version: '2.0 XEI DIRECT SHIFT',
        manufactureYear: 2024,
        modelYear: 2024,
        color: 'PRETO',
        fuel: 'FLEX',
        renavam: '65478912365',
        chassis: '9BR147852N8456123',
        category: 'SEDAN MEDIO',
        currentMileage: 19800,
        status: 'RENTED',
        purchaseValue: 149000.0,
        purchaseDate: '2024-02-10',
        dailyRate: 220.0,
        weeklyRate: 1350.0,
        biweeklyRate: 2600.0,
        monthlyRate: 4600.0,
        mileageAllowance: 3500,
        excessMileageRate: 0.75,
        nextMaintenanceDate: '2026-11-20',
        insuranceProvider: 'PORTO SEGURO AUTO PREMIUM',
        insuranceExpiration: '2027-02-09',
        tracker: 'RASTREADOR VIP COM ASSISTÊNCIA 24H',
        notes: 'LOCAÇÃO CORPORATIVA PARA DIRETORIA DA EMPRESA TRANSEXPRESS.',
        createdAt: now,
        updatedAt: now,
      }
    );

    // 5. Initial Rentals
    const rental1Id = 'r-301';
    const rental2Id = 'r-302';

    this.rentals.push(
      {
        id: rental1Id,
        tenantId: companyId,
        companyId,
        codigoContrato: 'LOC-2026-000001',
        rentalNumber: 'LOC-2026-000001',
        clienteId: client1Id,
        clientId: client1Id,
        veiculoId: v1Id,
        vehicleId: v1Id,
        dataInicio: '2026-08-01T08:00:00.000Z',
        startDate: '2026-08-01T08:00:00.000Z',
        dataFimPrevista: '2026-09-30T18:00:00.000Z',
        endDate: '2026-09-30T18:00:00.000Z',
        dataFimReal: null,
        actualEndDate: null,
        tipoCobranca: 'SEMANAL',
        billingFrequency: 'SEMANAL',
        valorPeriodo: 700.0,
        amount: 700.0,
        diaVencimento: 5,
        dueDay: 5,
        quantidadePeriodos: 8,
        valorCaucao: 1500.0,
        depositAmount: 1500.0,
        caucaoRecebida: 1500.0,
        statusCaucao: 'RECEBIDA',
        kmInicial: 25000,
        initialMileage: 25000,
        kmFinal: null,
        finalMileage: null,
        franquiaKm: 4000,
        mileageAllowance: 4000,
        valorKmExcedente: 0.50,
        excessMileageRate: 0.50,
        valorTotalPrevisto: 5600.0,
        desconto: 0,
        acrescimos: 0,
        valorFinal: 5600.0,
        initialFuelLevel: 'CHEIO (1/1)',
        finalFuelLevel: null,
        status: 'ATIVA',
        observacoes: 'LOCAÇÃO SEMANAL PARA MOTORISTA DE APP. CAUÇÃO RECEBIDA VIA PIX.',
        notes: 'LOCAÇÃO SEMANAL PARA MOTORISTA DE APP. CAUÇÃO RECEBIDA VIA PIX.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: rental2Id,
        tenantId: companyId,
        companyId,
        codigoContrato: 'LOC-2026-000002',
        rentalNumber: 'LOC-2026-000002',
        clienteId: client3Id,
        clientId: client3Id,
        veiculoId: v6Id,
        vehicleId: v6Id,
        dataInicio: '2026-07-15T09:00:00.000Z',
        startDate: '2026-07-15T09:00:00.000Z',
        dataFimPrevista: '2027-07-15T18:00:00.000Z',
        endDate: '2027-07-15T18:00:00.000Z',
        dataFimReal: null,
        actualEndDate: null,
        tipoCobranca: 'MENSAL',
        billingFrequency: 'MENSAL',
        valorPeriodo: 4600.0,
        amount: 4600.0,
        diaVencimento: 15,
        dueDay: 15,
        quantidadePeriodos: 12,
        valorCaucao: 4600.0,
        depositAmount: 4600.0,
        caucaoRecebida: 4600.0,
        statusCaucao: 'RECEBIDA',
        kmInicial: 15000,
        initialMileage: 15000,
        kmFinal: null,
        finalMileage: null,
        franquiaKm: 3500,
        mileageAllowance: 3500,
        valorKmExcedente: 0.75,
        excessMileageRate: 0.75,
        valorTotalPrevisto: 55200.0,
        desconto: 0,
        acrescimos: 0,
        valorFinal: 55200.0,
        initialFuelLevel: 'CHEIO (1/1)',
        finalFuelLevel: null,
        status: 'ATIVA',
        observacoes: 'CONTRATO ANUAL CORPORATIVO DE LONGA DURAÇÃO.',
        notes: 'CONTRATO ANUAL CORPORATIVO DE LONGA DURAÇÃO.',
        createdAt: now,
        updatedAt: now,
      }
    );

    // Initial Rental Payments
    this.rentalPayments.push(
      // Rental 1 (Weekly payments)
      {
        id: 'rp-101',
        tenantId: companyId,
        rentalId: rental1Id,
        numeroParcela: 1,
        descricao: 'Parcela 1/8 - Locação LOC-2026-000001',
        valor: 700.0,
        dataVencimento: '2026-08-01',
        dataPagamento: '2026-08-01',
        formaPagamento: 'PIX',
        status: 'PAGO',
        observacoes: 'PAGO NO ATO DA ENTREGA DO VEÍCULO',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'rp-102',
        tenantId: companyId,
        rentalId: rental1Id,
        numeroParcela: 2,
        descricao: 'Parcela 2/8 - Locação LOC-2026-000001',
        valor: 700.0,
        dataVencimento: '2026-08-08',
        dataPagamento: '2026-08-08',
        formaPagamento: 'PIX',
        status: 'PAGO',
        observacoes: 'PAGO VIA PIX',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'rp-103',
        tenantId: companyId,
        rentalId: rental1Id,
        numeroParcela: 3,
        descricao: 'Parcela 3/8 - Locação LOC-2026-000001',
        valor: 700.0,
        dataVencimento: '2026-08-15',
        dataPagamento: '2026-08-15',
        formaPagamento: 'PIX',
        status: 'PAGO',
        observacoes: 'PAGO VIA PIX',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'rp-104',
        tenantId: companyId,
        rentalId: rental1Id,
        numeroParcela: 4,
        descricao: 'Parcela 4/8 - Locação LOC-2026-000001',
        valor: 700.0,
        dataVencimento: '2026-08-22',
        dataPagamento: '2026-08-22',
        formaPagamento: 'PIX',
        status: 'PAGO',
        observacoes: 'PAGO VIA PIX',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'rp-105',
        tenantId: companyId,
        rentalId: rental1Id,
        numeroParcela: 5,
        descricao: 'Parcela 5/8 - Locação LOC-2026-000001',
        valor: 700.0,
        dataVencimento: '2026-08-29',
        dataPagamento: '2026-08-29',
        formaPagamento: 'PIX',
        status: 'PAGO',
        observacoes: 'PAGO VIA PIX',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'rp-106',
        tenantId: companyId,
        rentalId: rental1Id,
        numeroParcela: 6,
        descricao: 'Parcela 6/8 - Locação LOC-2026-000001',
        valor: 700.0,
        dataVencimento: '2026-09-05',
        dataPagamento: null,
        formaPagamento: 'PIX',
        status: 'PENDENTE',
        observacoes: 'PRÓXIMO VENCIMENTO',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'rp-107',
        tenantId: companyId,
        rentalId: rental1Id,
        numeroParcela: 7,
        descricao: 'Parcela 7/8 - Locação LOC-2026-000001',
        valor: 700.0,
        dataVencimento: '2026-09-12',
        dataPagamento: null,
        formaPagamento: 'PIX',
        status: 'PENDENTE',
        observacoes: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'rp-108',
        tenantId: companyId,
        rentalId: rental1Id,
        numeroParcela: 8,
        descricao: 'Parcela 8/8 - Locação LOC-2026-000001',
        valor: 700.0,
        dataVencimento: '2026-09-19',
        dataPagamento: null,
        formaPagamento: 'PIX',
        status: 'PENDENTE',
        observacoes: null,
        createdAt: now,
        updatedAt: now,
      },
      // Rental 2 (Monthly payments)
      {
        id: 'rp-201',
        tenantId: companyId,
        rentalId: rental2Id,
        numeroParcela: 1,
        descricao: 'Mensalidade 1/12 - Locação LOC-2026-000002',
        valor: 4600.0,
        dataVencimento: '2026-07-15',
        dataPagamento: '2026-07-15',
        formaPagamento: 'TRANSFERÊNCIA',
        status: 'PAGO',
        observacoes: 'PAGO VIA TED',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'rp-202',
        tenantId: companyId,
        rentalId: rental2Id,
        numeroParcela: 2,
        descricao: 'Mensalidade 2/12 - Locação LOC-2026-000002',
        valor: 4600.0,
        dataVencimento: '2026-08-15',
        dataPagamento: '2026-08-14',
        formaPagamento: 'TRANSFERÊNCIA',
        status: 'PAGO',
        observacoes: 'PAGO ANTECIPADO',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'rp-203',
        tenantId: companyId,
        rentalId: rental2Id,
        numeroParcela: 3,
        descricao: 'Mensalidade 3/12 - Locação LOC-2026-000002',
        valor: 4600.0,
        dataVencimento: '2026-09-15',
        dataPagamento: null,
        formaPagamento: 'BOLETO',
        status: 'PENDENTE',
        observacoes: 'BOLETO BANCÁRIO GERADO',
        createdAt: now,
        updatedAt: now,
      }
    );

    // Initial Rental Inspections
    this.rentalInspections.push(
      {
        id: 'ri-001',
        tenantId: companyId,
        rentalId: rental1Id,
        tipo: 'SAIDA',
        dataVistoria: '2026-08-01T08:00:00.000Z',
        km: 25000,
        nivelCombustivel: 'CHEIO (1/1)',
        itensChecklist: [
          { item: 'DOCUMENTAÇÃO (CRLV-e)', ok: true },
          { item: 'CHAVE PRINCIPAL E RESERVA', ok: true },
          { item: 'MANUAL DO PROPRIETÁRIO', ok: true },
          { item: 'ESTEPE, MACACO E CHAVE DE RODA', ok: true },
          { item: 'TRIÂNGULO DE SEGURANÇA', ok: true },
          { item: 'PNEUS EM BOM ESTADO', ok: true },
          { item: 'FARÓIS E LUZES FUNCIONANDO', ok: true },
          { item: 'AR CONDICIONADO E MULTIMÍDIA', ok: true },
        ],
        avariasIdentificadas: ['PEQUENO RISCO SUPERFICIAL NO PARACHOQUE DIANTEIRO DIREITO'],
        responsavelNome: 'CARLOS SILVA (ADMIN)',
        observacoes: 'VEÍCULO HIGIENIZADO E REVISADO ANTES DA ENTREGA.',
        statusAprovacao: 'APROVADO',
        createdAt: now,
      },
      {
        id: 'ri-002',
        tenantId: companyId,
        rentalId: rental2Id,
        tipo: 'SAIDA',
        dataVistoria: '2026-07-15T09:00:00.000Z',
        km: 15000,
        nivelCombustivel: 'CHEIO (1/1)',
        itensChecklist: [
          { item: 'DOCUMENTAÇÃO (CRLV-e)', ok: true },
          { item: 'CHAVE PRESENCIAL', ok: true },
          { item: 'MANUAL DO PROPRIETÁRIO', ok: true },
          { item: 'ESTEPE, MACACO E CHAVE DE RODA', ok: true },
          { item: 'TRIÂNGULO DE SEGURANÇA', ok: true },
          { item: 'PNEUS EM EXCELENTE ESTADO', ok: true },
        ],
        avariasIdentificadas: [],
        responsavelNome: 'MARIANA COSTA (GERENTE)',
        observacoes: 'VEÍCULO IMPECÁVEL, ENTREGUE À DIRETORIA DA TRANSEXPRESS.',
        statusAprovacao: 'APROVADO',
        createdAt: now,
      }
    );

    // 6. Initial Payments
    this.payments.push(
      {
        id: 'p-401',
        companyId,
        rentalId: rental1Id,
        dueDate: '2026-08-01',
        paidDate: '2026-08-01',
        amount: 700.0,
        paidAmount: 700.0,
        paymentMethod: 'PIX',
        status: 'PAID',
        receiptUrl: null,
        notes: 'PAGAMENTO DA 1ª SEMANA',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'p-402',
        companyId,
        rentalId: rental1Id,
        dueDate: '2026-08-08',
        paidDate: '2026-08-08',
        amount: 700.0,
        paidAmount: 700.0,
        paymentMethod: 'PIX',
        status: 'PAID',
        receiptUrl: null,
        notes: 'PAGAMENTO DA 2ª SEMANA',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'p-403',
        companyId,
        rentalId: rental1Id,
        dueDate: '2026-08-15',
        paidDate: '2026-08-15',
        amount: 700.0,
        paidAmount: 700.0,
        paymentMethod: 'PIX',
        status: 'PAID',
        receiptUrl: null,
        notes: 'PAGAMENTO DA 3ª SEMANA',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'p-404',
        companyId,
        rentalId: rental1Id,
        dueDate: '2026-08-22',
        paidDate: '2026-08-22',
        amount: 700.0,
        paidAmount: 700.0,
        paymentMethod: 'PIX',
        status: 'PAID',
        receiptUrl: null,
        notes: 'PAGAMENTO DA 4ª SEMANA',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'p-405',
        companyId,
        rentalId: rental1Id,
        dueDate: '2026-09-05',
        paidDate: null,
        amount: 700.0,
        paidAmount: null,
        paymentMethod: 'BOLETO',
        status: 'PENDING',
        receiptUrl: null,
        notes: 'PAGAMENTO DA 5ª SEMANA - A VENCER',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'p-406',
        companyId,
        rentalId: rental2Id,
        dueDate: '2026-08-15',
        paidDate: '2026-08-14',
        amount: 4600.0,
        paidAmount: 4600.0,
        paymentMethod: 'TRANSFER',
        status: 'PAID',
        receiptUrl: null,
        notes: 'MENSALIDADE CORPORATIVA AGOSTO/2026',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'p-407',
        companyId,
        rentalId: rental2Id,
        dueDate: '2026-09-15',
        paidDate: null,
        amount: 4600.0,
        paidAmount: null,
        paymentMethod: 'BOLETO',
        status: 'PENDING',
        receiptUrl: null,
        notes: 'MENSALIDADE CORPORATIVA SETEMBRO/2026',
        createdAt: now,
        updatedAt: now,
      }
    );

    // 7. Initial Workshops
    const ws1Id = 'ws-01';
    const ws2Id = 'ws-02';
    const ws3Id = 'ws-03';

    this.workshops.push(
      {
        id: ws1Id,
        companyId,
        tenantId: companyId,
        nome: 'AUTO CENTER PAULISTA & BOSCH CAR SERVICE',
        cnpj: '11.222.333/0001-44',
        telefone: '(11) 3214-5500',
        email: 'contato@autocenterpaulista.com.br',
        endereco: 'AV. SANTO AMARO, 2450',
        cidade: 'SÃO PAULO',
        uf: 'SP',
        observacoes: 'OFICINA CREDENCIADA PRINCIPAL PARA REVISÕES MECÂNICAS, FREIOS E SUSPENSÃO.',
        ativo: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: ws2Id,
        companyId,
        tenantId: companyId,
        nome: 'PNEUS & CIA ZONA SUL - AUTO CENTER',
        cnpj: '22.333.444/0001-55',
        telefone: '(11) 5055-8800',
        email: 'atendimento@pneusecia.com.br',
        endereco: 'AV. DOS BANDEIRANTES, 1100',
        cidade: 'SÃO PAULO',
        uf: 'SP',
        observacoes: 'ESPECIALIZADA EM GEOMETRIA COMPUTADORIZADA, ALINHAMENTO 3D, BALANCEAMENTO E TROCA DE PNEUS.',
        ativo: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: ws3Id,
        companyId,
        tenantId: companyId,
        nome: 'OFICINA ESPECIALIZADA FREIOS & INJEÇÃO BRASIL',
        cnpj: '33.444.555/0001-66',
        telefone: '(11) 2978-4411',
        email: 'financeiro@freiosbrasil.com.br',
        endereco: 'RUA VOLUNTÁRIOS DA PÁTRIA, 3800',
        cidade: 'SÃO PAULO',
        uf: 'SP',
        observacoes: 'ESPECIALISTA EM SISTEMAS DE FREIOS ABS, SISTEMAS DE ARREFECIMENTO E INJEÇÃO DIRETA.',
        ativo: true,
        createdAt: now,
        updatedAt: now,
      }
    );

    // 7.1 Initial Suppliers
    const sup1Id = 'sup-01';
    const sup2Id = 'sup-02';
    const sup3Id = 'sup-03';

    this.suppliers.push(
      {
        id: sup1Id,
        companyId,
        tenantId: companyId,
        nome: 'DISTRIBUIDORA DE AUTO PEÇAS SÃO PAULO LTDA',
        tipo: 'PECAS',
        cpfCnpj: '44.555.666/0001-77',
        telefone: '(11) 3344-9900',
        email: 'vendas@autopecassaopaulo.com.br',
        endereco: 'AV. CRUZEIRO DO SUL, 950 - CANINDÉ',
        observacoes: 'FORNECEDOR DE PEÇAS ORIGINAIS VW, CHEVROLET, HYUNDAI E FIAT COM PRAZO DE 28 DIAS.',
        ativo: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: sup2Id,
        companyId,
        tenantId: companyId,
        nome: 'LUBRIFICANTES & FILTROS BRASIL DISTRIBUIDORA',
        tipo: 'PECAS',
        cpfCnpj: '55.666.777/0001-88',
        telefone: '(11) 2233-7744',
        email: 'comercial@lubrificantesbrasil.com.br',
        endereco: 'RUA DAS NAÇÕES, 400 - VILA GUILHERME',
        observacoes: 'DISTRIBUIDOR AUTORIZADO DE ÓLEOS SINTÉTICOS, ADITIVOS E FILTROS DE AR E COMBUSTÍVEL.',
        ativo: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: sup3Id,
        companyId,
        tenantId: companyId,
        nome: 'BOSCH SERVICE BRASIL TECNOLOGIA AUTOMOTIVA',
        tipo: 'SERVICOS',
        cpfCnpj: '66.777.888/0001-99',
        telefone: '(11) 4004-9898',
        email: 'suporte@boschservice.com.br',
        endereco: 'AV. ENG. ARMANDO DE ARRUDA PEREIRA, 2900 - JABAQUARA',
        observacoes: 'FORNECEDOR DE DIAGNÓSTICO ELETRÔNICO AVANÇADO, SISTEMAS DE INJEÇÃO E BATERIAS SELADAS.',
        ativo: true,
        createdAt: now,
        updatedAt: now,
      }
    );

    // 7.2 Initial Maintenance Plans (Planos Preventivos)
    this.maintenancePlans.push(
      {
        id: 'plan-01',
        companyId,
        tenantId: companyId,
        vehicleId: null, // Padrão da frota
        nomeServico: 'TROCA DE ÓLEO E FILTRO DO MOTOR',
        descricao: 'SUBSTITUIÇÃO DO ÓLEO LUBRIFICANTE 5W30 SINTÉTICO E FILTRO DE ÓLEO A CADA 10.000 KM OU 6 MESES.',
        intervaloKm: 10000,
        ultimaKm: null,
        proximaKm: null,
        intervaloDias: 180,
        ultimaData: null,
        proximaData: null,
        alertaKmFaltando: 1000,
        alertaDiasFaltando: 15,
        status: 'ATIVO',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'plan-02',
        companyId,
        tenantId: companyId,
        vehicleId: null,
        nomeServico: 'FILTROS DE AR E COMBUSTÍVEL',
        descricao: 'TROCA DO ELEMENTO FILTRANTE DO AR DO MOTOR E FILTRO DE COMBUSTÍVEL A CADA 10.000 KM.',
        intervaloKm: 10000,
        ultimaKm: null,
        proximaKm: null,
        intervaloDias: 180,
        ultimaData: null,
        proximaData: null,
        alertaKmFaltando: 1000,
        alertaDiasFaltando: 15,
        status: 'ATIVO',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'plan-03',
        companyId,
        tenantId: companyId,
        vehicleId: null,
        nomeServico: 'RODÍZIO, ALINHAMENTO E BALANCEAMENTO',
        descricao: 'ALINHAMENTO DA DIREÇÃO 3D, BALANCEAMENTO DAS 4 RODAS E RODÍZIO DE PNEUS.',
        intervaloKm: 10000,
        ultimaKm: null,
        proximaKm: null,
        intervaloDias: 180,
        ultimaData: null,
        proximaData: null,
        alertaKmFaltando: 1000,
        alertaDiasFaltando: 15,
        status: 'ATIVO',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'plan-04',
        companyId,
        tenantId: companyId,
        vehicleId: null,
        nomeServico: 'INSPEÇÃO DE FREIOS E PASTILHAS',
        descricao: 'VERIFICAÇÃO DE ESPESSURA DAS PASTILHAS E DISCOS DE FREIO, NÍVEL E UMIDADE DO FLUIDO DOT4.',
        intervaloKm: 20000,
        ultimaKm: null,
        proximaKm: null,
        intervaloDias: 365,
        ultimaData: null,
        proximaData: null,
        alertaKmFaltando: 1500,
        alertaDiasFaltando: 20,
        status: 'ATIVO',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'plan-05',
        companyId,
        tenantId: companyId,
        vehicleId: null,
        nomeServico: 'CORREIA DENTADA E TENSOR DO MOTOR',
        descricao: 'SUBSTITUIÇÃO DO KIT CORREIA SINCRONIZADORA E TENSOR A CADA 50.000 KM OU 3 ANOS.',
        intervaloKm: 50000,
        ultimaKm: null,
        proximaKm: null,
        intervaloDias: 1095,
        ultimaData: null,
        proximaData: null,
        alertaKmFaltando: 3000,
        alertaDiasFaltando: 30,
        status: 'ATIVO',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'plan-06',
        companyId,
        tenantId: companyId,
        vehicleId: null,
        nomeServico: 'REVISÃO GERAL PERIÓDICA',
        descricao: 'CHECKLIST COMPLETO DE MAIS DE 50 ITENS: SUSPENSÃO, ILUMINAÇÃO, BATERIA, AR CONDICIONADO E FLUIDOS.',
        intervaloKm: 20000,
        ultimaKm: null,
        proximaKm: null,
        intervaloDias: 365,
        ultimaData: null,
        proximaData: null,
        alertaKmFaltando: 1500,
        alertaDiasFaltando: 20,
        status: 'ATIVO',
        createdAt: now,
        updatedAt: now,
      },
      // Planos específicos vinculados a veículos para alertas reais:
      {
        id: 'plan-v1-01',
        companyId,
        tenantId: companyId,
        vehicleId: v1Id, // ONIX BRA2E19 (28.450 km) -> Próxima revisão 30.000 km -> Faltam 1.550 km (ATENCAO)
        nomeServico: 'REVISÃO DE 30.000 KM - ONIX TURBO',
        descricao: 'REVISÃO PROGRAMADA CONCESSIONÁRIA: ÓLEO, FILTROS E VISTORIA COMPLETA.',
        intervaloKm: 10000,
        ultimaKm: 20000,
        proximaKm: 30000,
        intervaloDias: 180,
        ultimaData: '2026-03-10T10:00:00.000Z',
        proximaData: '2026-09-10T10:00:00.000Z',
        alertaKmFaltando: 2000,
        alertaDiasFaltando: 15,
        status: 'ATIVO',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'plan-v2-01',
        companyId,
        tenantId: companyId,
        vehicleId: v2Id, // HB20 RIO4F22 (41.200 km) -> Fez 40.000 km, próxima 50.000 km
        nomeServico: 'TROCA DE ÓLEO & FILTROS HB20',
        descricao: 'ÓLEO 5W30 SINTÉTICO E FILTROS.',
        intervaloKm: 10000,
        ultimaKm: 40150,
        proximaKm: 50150,
        intervaloDias: 180,
        ultimaData: '2026-08-12T10:00:00.000Z',
        proximaData: '2027-02-12T10:00:00.000Z',
        alertaKmFaltando: 1000,
        alertaDiasFaltando: 15,
        status: 'ATIVO',
        createdAt: now,
        updatedAt: now,
      }
    );

    // 7.3 Initial Maintenances with Services and Parts
    const m1Id = 'm-501';
    const m2Id = 'm-502';
    const m3Id = 'm-503';

    this.maintenances.push(
      {
        id: m1Id,
        companyId,
        tenantId: companyId,
        codigo: 'MAN-2026-000001',
        vehicleId: v3Id,
        type: 'BRAKES',
        status: 'IN_PROGRESS',
        titulo: 'SUBSTITUIÇÃO DE PASTILHAS E DISCOS DE FREIO DIANTEIROS',
        descricao: 'SUBSTITUIÇÃO DE PASTILHAS DE FREIO E RETÍFICA DE DISCOS DIANTEIROS COM SANGRIA E FLUIDO DOT4.',
        kmEntrada: 74800,
        kmConclusao: null,
        dataAgendamento: '2026-09-01T08:00:00.000Z',
        dataInicio: '2026-09-02T08:30:00.000Z',
        dataConclusao: null,
        custoPecas: 400.0,
        custoMaoDeObra: 250.0,
        custoOutros: 0.0,
        custoTotal: 650.0,
        supplierId: sup1Id,
        workshopId: ws1Id,
        workshop: 'AUTO CENTER PAULISTA & BOSCH CAR SERVICE',
        financialTransactionId: null,
        observacoes: 'PREVISÃO DE LIBERAÇÃO DO VEÍCULO EM 2 DIAS ÚTEIS. AGUARDANDO RETÍFICA.',
        createdBy: 'u-admin-1',
        createdAt: now,
        updatedAt: now,
        // Legacy
        description: 'SUBSTITUIÇÃO DE PASTILHAS DE FREIO E RETÍFICA DE DISCOS DIANTEIROS',
        scheduledDate: '2026-09-01',
        mileage: 74800,
        cost: 650.0,
      },
      {
        id: m2Id,
        companyId,
        tenantId: companyId,
        codigo: 'MAN-2026-000002',
        vehicleId: v2Id,
        type: 'PREVENTIVE',
        status: 'COMPLETED',
        titulo: 'REVISÃO PREVENTIVA PROGRAMADA DE 40.000 KM',
        descricao: 'TROCA DE ÓLEO 5W30 SINTÉTICO, FILTRO DE ÓLEO, FILTRO DE AR, FILTRO DE COMBUSTÍVEL E HIGIENIZAÇÃO.',
        kmEntrada: 40150,
        kmConclusao: 40155,
        dataAgendamento: '2026-08-10T09:00:00.000Z',
        dataInicio: '2026-08-12T08:00:00.000Z',
        dataConclusao: '2026-08-12T17:30:00.000Z',
        custoPecas: 520.0,
        custoMaoDeObra: 300.0,
        custoOutros: 0.0,
        custoTotal: 820.0,
        supplierId: sup2Id,
        workshopId: ws1Id,
        workshop: 'AUTO CENTER PAULISTA & BOSCH CAR SERVICE',
        financialTransactionId: 'ft-m-502',
        observacoes: 'MANUTENÇÃO CONCLUÍDA COM SUCESSO. VEÍCULO TESTADO E APROVADO.',
        createdBy: 'u-admin-1',
        createdAt: '2026-08-10T10:00:00.000Z',
        updatedAt: '2026-08-12T18:00:00.000Z',
        // Legacy
        description: 'REVISÃO PREVENTIVA PROGRAMADA DE 40.000 KM',
        scheduledDate: '2026-08-10',
        completedDate: '2026-08-12',
        mileage: 40150,
        cost: 820.0,
      },
      {
        id: m3Id,
        companyId,
        tenantId: companyId,
        codigo: 'MAN-2026-000003',
        vehicleId: v1Id,
        type: 'TIRES',
        status: 'SCHEDULED',
        titulo: 'SUBSTITUIÇÃO DE 2 PNEUS DIANTEIROS E ALINHAMENTO 3D',
        descricao: 'DESGASTE NATURAL DOS PNEUS DIANTEIROS. SUBSTITUIÇÃO POR PNEUS 185/65 R15 E GEOMETRIA COMPUTADORIZADA.',
        kmEntrada: 28450,
        kmConclusao: null,
        dataAgendamento: '2026-09-12T14:00:00.000Z',
        dataInicio: null,
        dataConclusao: null,
        custoPecas: 780.0,
        custoMaoDeObra: 160.0,
        custoOutros: 0.0,
        custoTotal: 940.0,
        supplierId: sup1Id,
        workshopId: ws2Id,
        workshop: 'PNEUS & CIA ZONA SUL - AUTO CENTER',
        financialTransactionId: null,
        observacoes: 'AGENDADO PARA O PERÍODO DA TARDE. CONFIRMADA DISPONIBILIDADE DOS PNEUS.',
        createdBy: 'u-admin-1',
        createdAt: now,
        updatedAt: now,
        // Legacy
        description: 'SUBSTITUIÇÃO DE 2 PNEUS DIANTEIROS E ALINHAMENTO 3D',
        scheduledDate: '2026-09-12',
        mileage: 28450,
        cost: 940.0,
      }
    );

    // Initial Services and Parts for m1Id (MAN-2026-000001)
    this.maintenanceServices.push({
      id: 'ms-101',
      maintenanceId: m1Id,
      descricao: 'MÃO DE OBRA: SUBSTITUIÇÃO PASTILHAS E SANGRIA FREIOS',
      quantidade: 1,
      valorUnitario: 250.0,
      valorTotal: 250.0,
      createdAt: now,
      updatedAt: now,
    });

    this.maintenanceParts.push(
      {
        id: 'mp-101',
        maintenanceId: m1Id,
        nome: 'JOGO DE PASTILHAS DE FREIO DIANTEIRAS BOSCH',
        codigo: 'BOS-0986BB0741',
        quantidade: 1,
        valorUnitario: 280.0,
        valorTotal: 280.0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'mp-102',
        maintenanceId: m1Id,
        nome: 'FLUIDO DE FREIO SINTÉTICO DOT 4 500ML',
        codigo: 'FL-DOT4-500',
        quantidade: 2,
        valorUnitario: 60.0,
        valorTotal: 120.0,
        createdAt: now,
        updatedAt: now,
      }
    );

    // Initial Services and Parts for m2Id (MAN-2026-000002)
    this.maintenanceServices.push({
      id: 'ms-201',
      maintenanceId: m2Id,
      descricao: 'REVISÃO GERAL, TROCA DE FILTROS E HIGIENIZAÇÃO DE CABINE',
      quantidade: 1,
      valorUnitario: 300.0,
      valorTotal: 300.0,
      createdAt: now,
      updatedAt: now,
    });

    this.maintenanceParts.push(
      {
        id: 'mp-201',
        maintenanceId: m2Id,
        nome: 'ÓLEO SINTÉTICO 5W30 MOTOR OIL 1L',
        codigo: 'OIL-5W30-1L',
        quantidade: 4,
        valorUnitario: 65.0,
        valorTotal: 260.0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'mp-202',
        maintenanceId: m2Id,
        nome: 'FILTRO DE ÓLEO HB20 1.0',
        codigo: 'FL-OIL-HB20',
        quantidade: 1,
        valorUnitario: 55.0,
        valorTotal: 55.0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'mp-203',
        maintenanceId: m2Id,
        nome: 'FILTRO DE AR DO MOTOR',
        codigo: 'FL-AR-HB20',
        quantidade: 1,
        valorUnitario: 75.0,
        valorTotal: 75.0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'mp-204',
        maintenanceId: m2Id,
        nome: 'FILTRO DE COMBUSTÍVEL TOTALFLEX',
        codigo: 'FL-COMB-01',
        quantidade: 1,
        valorUnitario: 50.0,
        valorTotal: 50.0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'mp-205',
        maintenanceId: m2Id,
        nome: 'FILTRO DE CABINE (AR CONDICIONADO)',
        codigo: 'FL-CAB-01',
        quantidade: 1,
        valorUnitario: 80.0,
        valorTotal: 80.0,
        createdAt: now,
        updatedAt: now,
      }
    );

    // Initial Services and Parts for m3Id (MAN-2026-000003)
    this.maintenanceServices.push({
      id: 'ms-301',
      maintenanceId: m3Id,
      descricao: 'MONTAGEM DE PNEUS E ALINHAMENTO GEOMÉTRICO 3D',
      quantidade: 1,
      valorUnitario: 160.0,
      valorTotal: 160.0,
      createdAt: now,
      updatedAt: now,
    });

    this.maintenanceParts.push({
      id: 'mp-301',
      maintenanceId: m3Id,
      nome: 'PNEU 185/65 R15 PIRELLI CINTURATO P1',
      codigo: 'PNEU-185-65-15',
      quantidade: 2,
      valorUnitario: 390.0,
      valorTotal: 780.0,
      createdAt: now,
      updatedAt: now,
    });

    // Integrated Financial Transaction for Completed Maintenance m2Id
    this.financialTransactions.push({
      id: 'ft-m-502',
      tenantId: companyId,
      companyId,
      type: 'EXPENSE',
      origin: 'MAINTENANCE',
      description: 'MANUTENÇÃO MAN-2026-000002 - VEÍCULO PLACA RIO4F22',
      categoryId: 'cat-exp-01', // MANUTENÇÃO & PEÇAS
      costCenterId: 'cc-02', // FROTA
      clientId: null,
      vehicleId: v2Id,
      rentalId: null,
      rentalPaymentId: null,
      maintenanceId: m2Id,
      recurringId: null,
      grossAmount: 820.0,
      discountAmount: 0,
      interestAmount: 0,
      netAmount: 820.0,
      paidAmount: 820.0,
      remainingAmount: 0,
      competencyDate: '2026-08-12',
      dueDate: '2026-08-12',
      settlementDate: '2026-08-12',
      paymentMethod: 'PIX',
      status: 'PAID',
      isRecurring: false,
      notes: 'LANÇAMENTO FINANCEIRO AUTOMÁTICO VINCULADO À ORDEM DE SERVIÇO MAN-2026-000002.',
      createdAt: '2026-08-12T17:35:00.000Z',
      updatedAt: '2026-08-12T17:35:00.000Z',
    });

    // 8. Initial Expenses
    this.expenses.push(
      {
        id: 'e-601',
        companyId,
        vehicleId: v3Id,
        category: 'MANUTENCAO',
        description: 'PEÇAS E PASTILHAS DE FREIO BOSCH GOL',
        amount: 450.0,
        date: '2026-09-01',
        dueDate: '2026-09-10',
        status: 'PAID',
        notes: 'NOTA FISCAL ELETRÔNICA Nº 48192',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'e-602',
        companyId,
        vehicleId: null,
        category: 'SEGURO',
        description: 'APÓLICE COLETIVA DE FROTA MENSAL',
        amount: 1850.0,
        date: '2026-08-10',
        dueDate: '2026-08-10',
        status: 'PAID',
        notes: 'PORTO SEGURO CIA DE SEGUROS GERAIS',
        createdAt: now,
        updatedAt: now,
      }
    );

    // 9. Initial Fines
    this.fines.push({
      id: 'f-701',
      companyId,
      vehicleId: v1Id,
      clientId: client1Id,
      date: '2026-08-18T14:30:00.000Z',
      location: 'AV. 23 DE MAIO, KM 4 - SÃO PAULO/SP',
      description: 'TRANSITAR EM VELOCIDADE SUPERIOR À MÁXIMA PERMITIDA EM ATÉ 20%',
      amount: 130.16,
      points: 4,
      dueDate: '2026-09-25',
      status: 'PENDING',
      notes: 'MULTA EMITIDA PELO DSV. NOTIFICAÇÃO ENVIADA AO CONDUTOR LOCATÁRIO.',
      createdAt: now,
      updatedAt: now,
    });

    // 10. Audit Log
    this.auditLogs.push({
      id: 'a-801',
      companyId,
      userId: 'u-admin-1',
      action: 'SYSTEM_BOOT',
      entity: 'COMPANY',
      entityId: companyId,
      oldData: null,
      newData: 'SISTEMA INICIALIZADO COM SUCESSO.',
      createdAt: now,
    });

    // 11. Initial Financial Categories
    const catLocacaoId = 'cat-inc-01';
    const catTaxasId = 'cat-inc-02';
    const catAvariasId = 'cat-inc-03';
    const catOutrasRecId = 'cat-inc-04';

    const catManutId = 'cat-exp-01';
    const catSeguroId = 'cat-exp-02';
    const catIpvaId = 'cat-exp-03';
    const catCombustivelId = 'cat-exp-04';
    const catLavagemId = 'cat-exp-05';
    const catFolhaId = 'cat-exp-06';
    const catAdmId = 'cat-exp-07';
    const catTecId = 'cat-exp-08';
    const catOutrasDespId = 'cat-exp-09';

    this.financialCategories.push(
      // Income Categories
      {
        id: catLocacaoId,
        tenantId: companyId,
        companyId,
        name: 'LOCAÇÃO DE VEÍCULOS',
        type: 'INCOME',
        description: 'RECEITA RECORRENTE E DIÁRIAS DE LOCAÇÃO DE FROTA',
        color: '#10B981',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: catTaxasId,
        tenantId: companyId,
        companyId,
        name: 'TAXAS EXTRAS & QUILOMETRAGEM',
        type: 'INCOME',
        description: 'FRANQUIA DE KM EXCEDENTE, TAXAS DE HIGIENIZAÇÃO E COMBUSTÍVEL',
        color: '#06B6D4',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: catAvariasId,
        tenantId: companyId,
        companyId,
        name: 'AVARIAS & RESSARCIMENTOS',
        type: 'INCOME',
        description: 'RESSARCIMENTO DE AVARIAS, CO-PARTICIPAÇÃO E DANOS',
        color: '#F59E0B',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: catOutrasRecId,
        tenantId: companyId,
        companyId,
        name: 'OUTRAS RECEITAS OPERACIONAIS',
        type: 'INCOME',
        description: 'RECEITAS DIVERSAS E VENDAS DE ATIVOS',
        color: '#8B5CF6',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      // Expense Categories
      {
        id: catManutId,
        tenantId: companyId,
        companyId,
        name: 'MANUTENÇÃO & PEÇAS',
        type: 'EXPENSE',
        description: 'REVISÕES, PEÇAS, FREIOS, PNEUS E OFICINAS MECÂNICAS',
        color: '#EF4444',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: catSeguroId,
        tenantId: companyId,
        companyId,
        name: 'SEGURO DA FROTA & RASTREADORES',
        type: 'EXPENSE',
        description: 'APÓLICES DE SEGURO, TELEMETRIA E RASTREAMENTO VEICULAR',
        color: '#F97316',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: catIpvaId,
        tenantId: companyId,
        companyId,
        name: 'IPVA, LICENCIAMENTO & TAXAS',
        type: 'EXPENSE',
        description: 'TRIBUTOS OBRIGATÓRIOS, DETRAN, IPVA E DPVAT',
        color: '#DC2626',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: catCombustivelId,
        tenantId: companyId,
        companyId,
        name: 'COMBUSTÍVEL & ARRECADADORES',
        type: 'EXPENSE',
        description: 'ABASTECIMENTO INTERNO E GASTOS OPERACIONAIS DE DESLOCAMENTO',
        color: '#EAB308',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: catLavagemId,
        tenantId: companyId,
        companyId,
        name: 'LAVAGEM & HIGIENIZAÇÃO',
        type: 'EXPENSE',
        description: 'SERVIÇOS DE ESTÉTICA AUTOMOTIVA E LIMPEZA DA FROTA',
        color: '#3B82F6',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: catFolhaId,
        tenantId: companyId,
        companyId,
        name: 'FOLHA DE PAGAMENTO & ENCARGOS',
        type: 'EXPENSE',
        description: 'SALÁRIOS, COMISSÕES, FGTS E PRÓ-LABORE',
        color: '#6366F1',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: catAdmId,
        tenantId: companyId,
        companyId,
        name: 'ADMINISTRATIVO & ESCRITÓRIO',
        type: 'EXPENSE',
        description: 'ALUGUEL, ENERGIA, ÁGUA, INTERNET E SUPRIMENTOS',
        color: '#64748B',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: catTecId,
        tenantId: companyId,
        companyId,
        name: 'TECNOLOGIA & SOFTWARES',
        type: 'EXPENSE',
        description: 'SISTEMAS ERP, SERVIDORES CLOUD E TELECOM',
        color: '#0284C7',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: catOutrasDespId,
        tenantId: companyId,
        companyId,
        name: 'OUTRAS DESPESAS',
        type: 'EXPENSE',
        description: 'DESPESAS DIVERSAS NÃO CLASSIFICADAS',
        color: '#94A3B8',
        active: true,
        createdAt: now,
        updatedAt: now,
      }
    );

    // 12. Initial Cost Centers
    const ccFrotaId = 'cc-01';
    const ccAdmId = 'cc-02';
    const ccComId = 'cc-03';
    const ccManutId = 'cc-04';

    this.costCenters.push(
      {
        id: ccFrotaId,
        tenantId: companyId,
        companyId,
        code: '1001',
        name: 'OPERAÇÃO DE FROTA',
        description: 'CUSTOS DIRETOS E RECEITAS VINCULADAS AOS VEÍCULOS',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: ccAdmId,
        tenantId: companyId,
        companyId,
        code: '2001',
        name: 'ADMINISTRAÇÃO GERAL',
        description: 'DESPESAS CORPORATIVAS, GESTÃO E SEDE',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: ccComId,
        tenantId: companyId,
        companyId,
        code: '3001',
        name: 'COMERCIAL & LOCAÇÕES',
        description: 'EQUIPE DE VENDAS, MARKETING E ATENDIMENTO',
        active: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: ccManutId,
        tenantId: companyId,
        companyId,
        code: '4001',
        name: 'OFICINA & MANUTENÇÃO',
        description: 'SERVIÇOS TÉCNICOS, PEÇAS E PREPARAÇÃO DA FROTA',
        active: true,
        createdAt: now,
        updatedAt: now,
      }
    );

    // 13. Sync Initial Rental Payments as Financial Transactions (WITHOUT DUPLICATING)
    for (const rp of this.rentalPayments) {
      const rental = this.rentals.find((r) => r.id === rp.rentalId);
      const isPaid = rp.status === 'PAGO' || !!rp.dataPagamento;
      const today = now.split('T')[0];
      const isOverdue = !isPaid && rp.dataVencimento < today;

      const txStatus: FinancialStatus = isPaid ? 'PAID' : isOverdue ? 'OVERDUE' : 'PENDING';
      const txId = `tx-rp-${rp.id}`;

      this.financialTransactions.push({
        id: txId,
        tenantId: rp.tenantId,
        companyId: rp.tenantId,
        type: 'INCOME',
        origin: 'RENTAL',
        description: rp.descricao.toUpperCase(),
        categoryId: catLocacaoId,
        costCenterId: ccFrotaId,
        clientId: rental ? rental.clientId : null,
        vehicleId: rental ? rental.vehicleId : null,
        rentalId: rp.rentalId,
        rentalPaymentId: rp.id,
        grossAmount: rp.valor,
        discountAmount: 0,
        interestAmount: 0,
        netAmount: rp.valor,
        paidAmount: isPaid ? rp.valor : 0,
        remainingAmount: isPaid ? 0 : rp.valor,
        competencyDate: rp.dataVencimento,
        dueDate: rp.dataVencimento,
        settlementDate: isPaid ? (rp.dataPagamento || rp.dataVencimento) : null,
        paymentMethod: (rp.formaPagamento as FinancialPaymentMethod) || 'PIX',
        status: txStatus,
        isRecurring: true,
        installmentNumber: rp.numeroParcela,
        totalInstallments: rental ? rental.quantidadePeriodos : null,
        notes: rp.observacoes || null,
        createdAt: rp.createdAt,
        updatedAt: rp.updatedAt,
      });

      // If it was paid, record settlement
      if (isPaid) {
        this.financialSettlements.push({
          id: `stl-${rp.id}`,
          tenantId: rp.tenantId,
          companyId: rp.tenantId,
          transactionId: txId,
          amount: rp.valor,
          paymentDate: rp.dataPagamento || rp.dataVencimento,
          paymentMethod: (rp.formaPagamento as FinancialPaymentMethod) || 'PIX',
          interest: 0,
          fine: 0,
          discount: 0,
          notes: 'LIQUIDAÇÃO DE PARCELA DE CONTRATO DE LOCAÇÃO',
          userId: 'u-admin-1',
          createdAt: rp.dataPagamento ? `${rp.dataPagamento}T12:00:00.000Z` : now,
        });
      }
    }

    // 14. Initial Operational Expenses as Financial Transactions
    this.financialTransactions.push(
      {
        id: 'tx-exp-01',
        tenantId: companyId,
        companyId,
        type: 'EXPENSE',
        origin: 'MAINTENANCE',
        description: 'MANUTENÇÃO PREVENTIVA 30.000KM - RENAULT KWID (BRA2E19)',
        categoryId: catManutId,
        costCenterId: ccManutId,
        clientId: null,
        vehicleId: v1Id,
        rentalId: null,
        rentalPaymentId: null,
        grossAmount: 480.0,
        discountAmount: 0,
        interestAmount: 0,
        netAmount: 480.0,
        paidAmount: 480.0,
        remainingAmount: 0,
        competencyDate: '2026-08-10',
        dueDate: '2026-08-10',
        settlementDate: '2026-08-10',
        paymentMethod: 'PIX',
        status: 'PAID',
        isRecurring: false,
        notes: 'TROCA DE ÓLEO, FILTROS E REVISÃO DOS FREIOS DIANTEIROS',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'tx-exp-02',
        tenantId: companyId,
        companyId,
        type: 'EXPENSE',
        origin: 'INSURANCE',
        description: 'SEGURO FROTAS CORPORATIVAS - PARCELA 08/12 - PORTO SEGURO',
        categoryId: catSeguroId,
        costCenterId: ccFrotaId,
        clientId: null,
        vehicleId: null,
        rentalId: null,
        rentalPaymentId: null,
        grossAmount: 1250.0,
        discountAmount: 0,
        interestAmount: 0,
        netAmount: 1250.0,
        paidAmount: 1250.0,
        remainingAmount: 0,
        competencyDate: '2026-08-20',
        dueDate: '2026-08-20',
        settlementDate: '2026-08-20',
        paymentMethod: 'BOLETO',
        status: 'PAID',
        isRecurring: true,
        installmentNumber: 8,
        totalInstallments: 12,
        notes: 'COBERTURA COMPREENSIVA TOTAL PARA OS VEÍCULOS ATIVOS',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'tx-exp-03',
        tenantId: companyId,
        companyId,
        type: 'EXPENSE',
        origin: 'MAINTENANCE',
        description: 'SUBSTITUIÇÃO PASTILHAS FREIO & DISCOS - JEEP COMPASS (MER2026)',
        categoryId: catManutId,
        costCenterId: ccManutId,
        clientId: null,
        vehicleId: v3Id,
        rentalId: null,
        rentalPaymentId: null,
        grossAmount: 650.0,
        discountAmount: 0,
        interestAmount: 0,
        netAmount: 650.0,
        paidAmount: 0,
        remainingAmount: 650.0,
        competencyDate: '2026-09-02',
        dueDate: '2026-09-10',
        settlementDate: null,
        paymentMethod: 'BOLETO',
        status: 'PENDING',
        isRecurring: false,
        notes: 'OFICINA AUTO CENTER BRASIL - VENCIMENTO PARA 10/09',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'tx-exp-04',
        tenantId: companyId,
        companyId,
        type: 'EXPENSE',
        origin: 'OFFICE',
        description: 'ASSINATURA SISTEMA RASTREAMENTO & TELEMETRIA MENSAL',
        categoryId: catTecId,
        costCenterId: ccAdmId,
        clientId: null,
        vehicleId: null,
        rentalId: null,
        rentalPaymentId: null,
        grossAmount: 340.0,
        discountAmount: 0,
        interestAmount: 0,
        netAmount: 340.0,
        paidAmount: 0,
        remainingAmount: 340.0,
        competencyDate: '2026-09-01',
        dueDate: '2026-09-12',
        settlementDate: null,
        paymentMethod: 'PIX',
        status: 'PENDING',
        isRecurring: true,
        notes: 'FATURAÇÃO DE 5 VEÍCULOS CONECTADOS',
        createdAt: now,
        updatedAt: now,
      }
    );

    // Initial settlement for paid expenses
    this.financialSettlements.push(
      {
        id: 'stl-exp-01',
        tenantId: companyId,
        companyId,
        transactionId: 'tx-exp-01',
        amount: 480.0,
        paymentDate: '2026-08-10',
        paymentMethod: 'PIX',
        interest: 0,
        fine: 0,
        discount: 0,
        notes: 'PAGAMENTO À VISTA OFICINA',
        userId: 'u-admin-1',
        createdAt: `${now.split('T')[0]}T10:00:00.000Z`,
      },
      {
        id: 'stl-exp-02',
        tenantId: companyId,
        companyId,
        transactionId: 'tx-exp-02',
        amount: 1250.0,
        paymentDate: '2026-08-20',
        paymentMethod: 'BOLETO',
        interest: 0,
        fine: 0,
        discount: 0,
        notes: 'DÉBITO EM CONTA / BOLETO SEGURADORA',
        userId: 'u-admin-1',
        createdAt: `${now.split('T')[0]}T10:00:00.000Z`,
      }
    );
  }

  // Multi-tenant Safe Helper Methods

  generateContractNumber(companyId: string, year = new Date().getFullYear()): string {
    const prefix = `LOC-${year}-`;
    const companyRentals = this.rentals.filter((r) => r.companyId === companyId || r.tenantId === companyId);
    let maxSeq = 0;
    for (const r of companyRentals) {
      const code = r.codigoContrato || r.rentalNumber || '';
      if (code.startsWith(prefix)) {
        const parts = code.split('-');
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
    const nextSeq = maxSeq + 1;
    return `${prefix}${nextSeq.toString().padStart(6, '0')}`;
  }

  updateRentalPaymentStatuses() {
    const today = new Date().toISOString().split('T')[0];
    for (const p of this.rentalPayments) {
      if (p.status !== 'CANCELADO') {
        if (p.dataPagamento) {
          p.status = 'PAGO';
        } else if (p.dataVencimento < today) {
          p.status = 'ATRASADO';
        } else {
          p.status = 'PENDENTE';
        }
      }
    }
  }

  updateFinancialStatuses() {
    const today = new Date().toISOString().split('T')[0];
    for (const tx of this.financialTransactions) {
      if (tx.status !== 'PAID' && tx.status !== 'CANCELLED') {
        if (tx.remainingAmount <= 0) {
          tx.status = 'PAID';
        } else if (tx.dueDate < today) {
          tx.status = tx.paidAmount > 0 ? 'PARTIAL' : 'OVERDUE';
        } else if (tx.paidAmount > 0) {
          tx.status = 'PARTIAL';
        } else {
          tx.status = 'PENDING';
        }
      }
    }
  }

  syncRentalPaymentWithTransaction(rentalPayment: RentalPayment, rental?: Rental) {
    const r = rental || this.rentals.find((rent) => rent.id === rentalPayment.rentalId);
    let tx = this.financialTransactions.find((t) => t.rentalPaymentId === rentalPayment.id);

    const isPaid = rentalPayment.status === 'PAGO' || !!rentalPayment.dataPagamento;
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = !isPaid && rentalPayment.dataVencimento < today;
    const status: FinancialStatus = isPaid ? 'PAID' : isOverdue ? 'OVERDUE' : 'PENDING';

    const catLocacao = this.financialCategories.find((c) => c.name.includes('LOCAÇÃO') && c.type === 'INCOME');
    const ccFrota = this.costCenters.find((c) => c.name.includes('FROTA'));

    if (tx) {
      tx.description = rentalPayment.descricao.toUpperCase();
      tx.grossAmount = rentalPayment.valor;
      tx.netAmount = rentalPayment.valor;
      tx.dueDate = rentalPayment.dataVencimento;
      tx.competencyDate = rentalPayment.dataVencimento;
      if (isPaid && !tx.settlementDate) {
        tx.paidAmount = rentalPayment.valor;
        tx.remainingAmount = 0;
        tx.settlementDate = rentalPayment.dataPagamento || today;
        tx.status = 'PAID';
      }
      tx.updatedAt = new Date().toISOString();
    } else {
      const txId = `tx-rp-${rentalPayment.id}`;
      const newTx: FinancialTransaction = {
        id: txId,
        tenantId: rentalPayment.tenantId,
        companyId: rentalPayment.tenantId,
        type: 'INCOME',
        origin: 'RENTAL',
        description: rentalPayment.descricao.toUpperCase(),
        categoryId: catLocacao?.id || 'cat-inc-01',
        costCenterId: ccFrota?.id || 'cc-01',
        clientId: r ? r.clientId : null,
        vehicleId: r ? r.vehicleId : null,
        rentalId: rentalPayment.rentalId,
        rentalPaymentId: rentalPayment.id,
        grossAmount: rentalPayment.valor,
        discountAmount: 0,
        interestAmount: 0,
        netAmount: rentalPayment.valor,
        paidAmount: isPaid ? rentalPayment.valor : 0,
        remainingAmount: isPaid ? 0 : rentalPayment.valor,
        competencyDate: rentalPayment.dataVencimento,
        dueDate: rentalPayment.dataVencimento,
        settlementDate: isPaid ? (rentalPayment.dataPagamento || today) : null,
        paymentMethod: (rentalPayment.formaPagamento as FinancialPaymentMethod) || 'PIX',
        status,
        isRecurring: true,
        installmentNumber: rentalPayment.numeroParcela,
        totalInstallments: r ? r.quantidadePeriodos : null,
        notes: rentalPayment.observacoes || null,
        createdAt: rentalPayment.createdAt,
        updatedAt: new Date().toISOString(),
      };
      this.financialTransactions.push(newTx);
    }
  }

  settleTransaction(
    transactionId: string,
    tenantId: string,
    data: {
      amount: number;
      paymentDate: string;
      paymentMethod: FinancialPaymentMethod;
      interest?: number;
      fine?: number;
      discount?: number;
      notes?: string;
      receiptUrl?: string;
      userId?: string;
    }
  ): { transaction: FinancialTransaction; settlement: FinancialSettlement } {
    const tx = this.financialTransactions.find(
      (t) => t.id === transactionId && (t.tenantId === tenantId || t.companyId === tenantId)
    );
    if (!tx) {
      throw new Error('Transação financeira não encontrada');
    }

    if (tx.status === 'CANCELLED') {
      throw new Error('Não é possível liquidar uma transação cancelada');
    }

    const interest = Number(data.interest) || 0;
    const fine = Number(data.fine) || 0;
    const discount = Number(data.discount) || 0;
    const paidAmount = Number(data.amount);

    if (isNaN(paidAmount) || paidAmount <= 0) {
      throw new Error('O valor do pagamento deve ser maior que zero');
    }

    // Apply interest/fine/discount to transaction amounts
    tx.interestAmount = Number((tx.interestAmount + interest + fine).toFixed(2));
    tx.discountAmount = Number((tx.discountAmount + discount).toFixed(2));
    tx.netAmount = Number((tx.grossAmount + tx.interestAmount - tx.discountAmount).toFixed(2));

    const newTotalPaid = Number((tx.paidAmount + paidAmount).toFixed(2));
    tx.paidAmount = newTotalPaid;
    tx.remainingAmount = Math.max(0, Number((tx.netAmount - tx.paidAmount).toFixed(2)));

    const isFullyPaid = tx.remainingAmount <= 0.01;
    tx.status = isFullyPaid ? 'PAID' : 'PARTIAL';
    if (isFullyPaid) {
      tx.settlementDate = data.paymentDate;
      tx.paymentMethod = data.paymentMethod;
    }
    tx.updatedAt = new Date().toISOString();

    // Create settlement record
    const settlement: FinancialSettlement = {
      id: generateUUID(),
      tenantId,
      companyId: tenantId,
      transactionId: tx.id,
      amount: paidAmount,
      paymentDate: data.paymentDate,
      paymentMethod: data.paymentMethod,
      interest: interest + fine,
      fine: fine,
      discount: discount,
      receiptUrl: data.receiptUrl || null,
      notes: data.notes ? data.notes.toUpperCase() : null,
      userId: data.userId || null,
      createdAt: new Date().toISOString(),
    };
    this.financialSettlements.unshift(settlement);

    // If linked to a rentalPayment, synchronize it
    if (tx.rentalPaymentId) {
      const rp = this.rentalPayments.find((p) => p.id === tx.rentalPaymentId);
      if (rp) {
        if (isFullyPaid) {
          rp.status = 'PAGO';
          rp.dataPagamento = data.paymentDate;
          rp.formaPagamento = data.paymentMethod;
        } else {
          rp.observacoes = `PAGO PARCIAL: R$ ${paidAmount.toFixed(2)} EM ${data.paymentDate}. RESTANTE: R$ ${tx.remainingAmount.toFixed(2)}`;
        }
        rp.updatedAt = new Date().toISOString();
      }
    }

    this.createAuditLog(
      tenantId,
      data.userId,
      'SETTLEMENT',
      'FINANCIAL_TRANSACTION',
      tx.id,
      null,
      { amount: paidAmount, newStatus: tx.status, remaining: tx.remainingAmount }
    );

    return { transaction: tx, settlement };
  }

  cancelTransaction(transactionId: string, tenantId: string, userId?: string, reason?: string): FinancialTransaction {
    const tx = this.financialTransactions.find(
      (t) => t.id === transactionId && (t.tenantId === tenantId || t.companyId === tenantId)
    );
    if (!tx) {
      throw new Error('Transação financeira não encontrada');
    }

    const oldStatus = tx.status;
    tx.status = 'CANCELLED';
    tx.notes = tx.notes ? `${tx.notes} | CANCELAMENTO: ${reason || 'SEM JUSTIFICATIVA'}` : `CANCELAMENTO: ${reason || 'SEM JUSTIFICATIVA'}`;
    tx.updatedAt = new Date().toISOString();

    if (tx.rentalPaymentId) {
      const rp = this.rentalPayments.find((p) => p.id === tx.rentalPaymentId);
      if (rp) {
        rp.status = 'CANCELADO';
        rp.observacoes = rp.observacoes ? `${rp.observacoes} | CANCELADO NO FINANCEIRO` : 'CANCELADO NO FINANCEIRO';
        rp.updatedAt = new Date().toISOString();
      }
    }

    this.createAuditLog(
      tenantId,
      userId,
      'CANCEL',
      'FINANCIAL_TRANSACTION',
      tx.id,
      { status: oldStatus },
      { status: 'CANCELLED', reason }
    );

    return tx;
  }

  generateMaintenanceCode(companyId: string): string {
    const year = new Date().getFullYear();
    const count = this.maintenances.filter(
      (m) => m.companyId === companyId || m.tenantId === companyId
    ).length + 1;
    return `MAN-${year}-${String(count).padStart(6, '0')}`;
  }

  recalculateMaintenanceCosts(maintenanceId: string): Maintenance | undefined {
    const maintenance = this.maintenances.find((m) => m.id === maintenanceId);
    if (!maintenance) return undefined;

    const services = this.maintenanceServices.filter((s) => s.maintenanceId === maintenanceId);
    const parts = this.maintenanceParts.filter((p) => p.maintenanceId === maintenanceId);

    const custoMaoDeObra = Math.round(services.reduce((acc, s) => acc + (Number(s.valorTotal) || 0), 0) * 100) / 100;
    const custoPecas = Math.round(parts.reduce((acc, p) => acc + (Number(p.valorTotal) || 0), 0) * 100) / 100;
    const custoOutros = Math.round((Number(maintenance.custoOutros) || 0) * 100) / 100;
    const custoTotal = Math.round((custoMaoDeObra + custoPecas + custoOutros) * 100) / 100;

    maintenance.custoMaoDeObra = custoMaoDeObra;
    maintenance.custoPecas = custoPecas;
    maintenance.custoOutros = custoOutros;
    maintenance.custoTotal = custoTotal;
    maintenance.cost = custoTotal;
    maintenance.updatedAt = new Date().toISOString();

    // If maintenance already completed, synchronize with financial transaction
    if (maintenance.status === 'COMPLETED') {
      const vehicle = this.vehicles.find((v) => v.id === maintenance.vehicleId);
      if (vehicle) {
        this.syncMaintenanceWithFinancial(maintenance, vehicle);
      }
    }

    return maintenance;
  }

  syncMaintenanceWithFinancial(maintenance: Maintenance, vehicle: Vehicle): FinancialTransaction | null {
    const companyId = maintenance.companyId || maintenance.tenantId || vehicle.companyId;
    const now = new Date().toISOString();
    const totalCost = Math.round((Number(maintenance.custoTotal) || 0) * 100) / 100;

    // Find category for maintenance
    let cat = this.financialCategories.find(
      (c) => (c.companyId === companyId || c.tenantId === companyId) &&
             c.type === 'EXPENSE' &&
             (c.name.includes('MANUTENÇÃO') || c.name.includes('MANUTENCAO'))
    );
    if (!cat) {
      cat = {
        id: generateUUID(),
        tenantId: companyId,
        companyId,
        name: 'MANUTENÇÃO & PEÇAS',
        type: 'EXPENSE',
        description: 'DESPESAS COM REVISÕES, PEÇAS E OFICINAS MECÂNICAS',
        color: '#EF4444',
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      this.financialCategories.push(cat);
    }

    // Find cost center FROTA
    let costCenter = this.costCenters.find(
      (cc) => (cc.companyId === companyId || cc.tenantId === companyId) &&
             (cc.code === 'FROTA' || cc.name.toUpperCase().includes('FROTA'))
    );
    if (!costCenter) {
      costCenter = {
        id: generateUUID(),
        tenantId: companyId,
        companyId,
        code: 'FROTA',
        name: 'OPERAÇÃO DE FROTA',
        description: 'CENTRO DE CUSTOS PARA DESPESAS DIRETAS DA FROTA',
        active: true,
        createdAt: now,
        updatedAt: now,
      };
      this.costCenters.push(costCenter);
    }

    const description = `MANUTENÇÃO ${maintenance.codigo} - VEÍCULO PLACA ${vehicle.plate}`;

    // Look for existing transaction: strictly prevent duplication
    let tx = this.financialTransactions.find(
      (t) => (t.maintenanceId && t.maintenanceId === maintenance.id) ||
             (maintenance.financialTransactionId && t.id === maintenance.financialTransactionId)
    );

    if (tx) {
      // Update existing transaction
      tx.grossAmount = totalCost;
      tx.netAmount = totalCost;
      tx.remainingAmount = Math.max(0, Math.round((totalCost - (tx.paidAmount || 0)) * 100) / 100);
      tx.description = description;
      tx.vehicleId = vehicle.id;
      tx.notes = `DESPESA VINCULADA À ORDEM DE SERVIÇO ${maintenance.codigo}. STATUS DA OS: ${maintenance.status}.`;
      tx.updatedAt = now;

      if (tx.status === 'PENDING' && tx.remainingAmount <= 0.01 && totalCost > 0) {
        tx.status = 'PAID';
        tx.settlementDate = tx.settlementDate || now;
      }
    } else if (totalCost > 0) {
      // Create new transaction
      const newTxId = generateUUID();
      const compDate = (maintenance.dataConclusao || maintenance.dataInicio || maintenance.dataAgendamento || now).split('T')[0];
      const dueDate = (maintenance.dataConclusao || maintenance.dataAgendamento || now).split('T')[0];

      tx = {
        id: newTxId,
        tenantId: companyId,
        companyId,
        type: 'EXPENSE',
        origin: 'MAINTENANCE',
        description,
        categoryId: cat.id,
        costCenterId: costCenter.id,
        clientId: null,
        vehicleId: vehicle.id,
        rentalId: null,
        rentalPaymentId: null,
        maintenanceId: maintenance.id,
        recurringId: null,
        grossAmount: totalCost,
        discountAmount: 0,
        interestAmount: 0,
        netAmount: totalCost,
        paidAmount: 0,
        remainingAmount: totalCost,
        competencyDate: compDate,
        dueDate: dueDate,
        settlementDate: null,
        paymentMethod: null,
        status: 'PENDING',
        isRecurring: false,
        notes: `LANÇAMENTO FINANCEIRO AUTOMÁTICO VINCULADO À ORDEM DE SERVIÇO ${maintenance.codigo}.`,
        createdAt: now,
        updatedAt: now,
      };
      this.financialTransactions.push(tx);
      maintenance.financialTransactionId = newTxId;

      this.createAuditLog(
        companyId,
        maintenance.createdBy,
        'CREATE',
        'FINANCIAL_TRANSACTION',
        newTxId,
        null,
        { origin: 'MAINTENANCE', maintenanceCode: maintenance.codigo, amount: totalCost }
      );
    }

    return tx || null;
  }

  calculateMaintenanceAlerts(companyId: string) {
    const vehicles = this.vehicles.filter((v) => v.companyId === companyId);
    const plans = this.maintenancePlans.filter(
      (p) => (p.companyId === companyId || p.tenantId === companyId) && p.status === 'ATIVO'
    );
    const today = new Date();

    const alerts: Array<{
      id: string;
      vehicleId: string;
      vehiclePlate: string;
      vehicleModel: string;
      currentMileage: number;
      serviceName: string;
      tipo: 'KM' | 'DATA' | 'AMBOS';
      proximaKm: number | null;
      kmRestante: number | null;
      proximaData: string | null;
      diasRestantes: number | null;
      nivelAlerta: 'OK' | 'ATENCAO' | 'PROXIMA' | 'VENCIDA';
      motivo: string;
    }> = [];

    for (const vehicle of vehicles) {
      // Find plans applicable to this vehicle (generic fleet plans or specific)
      const applicablePlans = plans.filter((p) => p.vehicleId === null || p.vehicleId === vehicle.id);

      for (const plan of applicablePlans) {
        let proximaKm = plan.proximaKm;
        let proximaData = plan.proximaData;

        // If no proximaKm is set, calculate from last maintenance or interval
        if (!proximaKm && plan.intervaloKm) {
          const lastMaint = this.maintenances
            .filter((m) => m.vehicleId === vehicle.id && m.status === 'COMPLETED')
            .sort((a, b) => new Date(b.dataConclusao || b.updatedAt).getTime() - new Date(a.dataConclusao || a.updatedAt).getTime())[0];
          
          const baseKm = lastMaint ? (lastMaint.kmConclusao || lastMaint.kmEntrada) : 0;
          proximaKm = (plan.ultimaKm || baseKm) + plan.intervaloKm;
        }

        // If no proximaData is set, calculate from interval
        if (!proximaData && plan.intervaloDias) {
          const lastDate = plan.ultimaData ? new Date(plan.ultimaData) : new Date(vehicle.createdAt);
          const nextD = new Date(lastDate.getTime() + plan.intervaloDias * 24 * 60 * 60 * 1000);
          proximaData = nextD.toISOString().split('T')[0];
        }

        let kmRestante: number | null = null;
        let diasRestantes: number | null = null;
        let kmStatus: 'OK' | 'ATENCAO' | 'PROXIMA' | 'VENCIDA' = 'OK';
        let dateStatus: 'OK' | 'ATENCAO' | 'PROXIMA' | 'VENCIDA' = 'OK';

        if (proximaKm !== null && proximaKm !== undefined) {
          kmRestante = proximaKm - vehicle.currentMileage;
          const alertaKm = plan.alertaKmFaltando || 1000;

          if (kmRestante <= 0) {
            kmStatus = 'VENCIDA';
          } else if (kmRestante <= alertaKm) {
            kmStatus = 'PROXIMA';
          } else if (kmRestante <= alertaKm * 2) {
            kmStatus = 'ATENCAO';
          } else {
            kmStatus = 'OK';
          }
        }

        if (proximaData) {
          const pDate = new Date(proximaData);
          diasRestantes = Math.ceil((pDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const alertaDias = plan.alertaDiasFaltando || 15;

          if (diasRestantes <= 0) {
            dateStatus = 'VENCIDA';
          } else if (diasRestantes <= alertaDias) {
            dateStatus = 'PROXIMA';
          } else if (diasRestantes <= alertaDias * 2) {
            dateStatus = 'ATENCAO';
          } else {
            dateStatus = 'OK';
          }
        }

        // Rank worst status
        const rank = { VENCIDA: 4, PROXIMA: 3, ATENCAO: 2, OK: 1 };
        const worstRank = Math.max(rank[kmStatus], rank[dateStatus]);
        const finalStatus = (Object.keys(rank) as Array<'OK' | 'ATENCAO' | 'PROXIMA' | 'VENCIDA'>).find(
          (k) => rank[k] === worstRank
        ) || 'OK';

        // Only include if not OK or if plan is specific
        let motivo = '';
        if (finalStatus === 'VENCIDA') {
          if (kmStatus === 'VENCIDA') motivo += `Excedeu em ${Math.abs(kmRestante || 0)} KM. `;
          if (dateStatus === 'VENCIDA') motivo += `Venceu há ${Math.abs(diasRestantes || 0)} dias.`;
        } else if (finalStatus === 'PROXIMA') {
          if (kmStatus === 'PROXIMA') motivo += `Faltam ${kmRestante} KM. `;
          if (dateStatus === 'PROXIMA') motivo += `Faltam ${diasRestantes} dias.`;
        } else if (finalStatus === 'ATENCAO') {
          if (kmStatus === 'ATENCAO') motivo += `Atenção: faltam ${kmRestante} KM. `;
          if (dateStatus === 'ATENCAO') motivo += `Atenção: faltam ${diasRestantes} dias.`;
        } else {
          motivo = 'Em dia';
        }

        alerts.push({
          id: `${vehicle.id}-${plan.id}`,
          vehicleId: vehicle.id,
          vehiclePlate: vehicle.plate,
          vehicleModel: `${vehicle.brand} ${vehicle.model}`,
          currentMileage: vehicle.currentMileage,
          serviceName: plan.nomeServico,
          tipo: proximaKm && proximaData ? 'AMBOS' : proximaKm ? 'KM' : 'DATA',
          proximaKm,
          kmRestante,
          proximaData,
          diasRestantes,
          nivelAlerta: finalStatus,
          motivo: motivo.trim(),
        });
      }
    }

    // Sort by priority: VENCIDA first, then PROXIMA, then ATENCAO, then OK
    const priority = { VENCIDA: 0, PROXIMA: 1, ATENCAO: 2, OK: 3 };
    return alerts.sort((a, b) => priority[a.nivelAlerta] - priority[b.nivelAlerta]);
  }

  createAuditLog(companyId: string, userId: string | null | undefined, action: string, entity: string, entityId?: string, oldData?: any, newData?: any) {
    this.auditLogs.unshift({
      id: generateUUID(),
      companyId,
      userId: userId || null,
      action,
      entity,
      entityId: entityId || null,
      oldData: oldData ? JSON.stringify(oldData) : null,
      newData: newData ? JSON.stringify(newData) : null,
      createdAt: new Date().toISOString(),
    });
  }
}

export const db = new InMemoryDatabase();
export { generateUUID };

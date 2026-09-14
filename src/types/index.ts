export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'FINANCIAL';
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
export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE' | 'OIL_CHANGE' | 'TIRES' | 'BRAKES' | 'SUSPENSION' | 'ELECTRICAL' | 'ENGINE' | 'OTHER';
export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

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
  activeRentalsCount?: number;
  totalRentalsCount?: number;
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
  status: VehicleStatus;
  renavam?: string | null;
  chassis?: string | null;
  engine?: string | null;
  currentMileage: number;
  power?: string | null;
  displacement?: string | null;
  passengerCapacity?: number | null;
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
  activeRental?: {
    rentalId: string;
    rentalNumber: string;
    clientName: string;
    startDate: string;
    endDate: string;
    amount: number;
  } | null;
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

export interface RentalPayment {
  id: string;
  tenantId?: string;
  companyId?: string;
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
  tenantId?: string;
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

export interface Rental {
  id: string;
  tenantId?: string;
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

  // Relacionamentos e Enriquecimento
  client?: {
    id: string;
    name: string;
    cpfCnpj: string;
    phone: string;
    email: string;
    driverLicenseNumber?: string | null;
    driverLicenseExpiration?: string | null;
    active?: boolean;
  } | null;
  vehicle?: {
    id: string;
    plate: string;
    brand: string;
    model: string;
    year?: number;
    color?: string;
    category: string;
    currentMileage: number;
  } | null;
  payments?: RentalPayment[];
  inspections?: RentalInspection[];
  nextDueDate?: string | null;
  financialSummary?: {
    totalPaid: number;
    totalPending: number;
    totalOverdue?: number;
    paymentsCount: number;
    paidCount?: number;
    totalExpected?: number;
    depositAmount?: number;
    depositReceived?: number;
    depositStatus?: DepositStatus;
  };
}

export interface UpcomingDuePayment {
  id: string;
  rentalId: string;
  codigoContrato: string;
  clienteNome: string;
  clienteTelefone: string;
  veiculoModelo: string;
  veiculoPlaca: string;
  numeroParcela: number;
  dataVencimento: string;
  valor: number;
  status: RentalPaymentStatus;
  descricao: string;
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

export interface Maintenance {
  id: string;
  companyId: string;
  vehicleId: string;
  type: string;
  description: string;
  scheduledDate: string;
  completedDate?: string | null;
  mileage: number;
  cost: number;
  workshop: string;
  supplier?: string | null;
  nextMaintenanceDate?: string | null;
  nextMaintenanceMileage?: number | null;
  status: MaintenanceStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
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

export interface DashboardMetrics {
  totalVehicles: number;
  availableVehicles: number;
  rentedVehicles: number;
  maintenanceVehicles: number;
  blockedVehicles: number;
  totalClients: number;
  activeClients: number;
  activeRentals: number;
  overdueRentals?: number;
  totalRentals: number;
  totalRevenue: number;
  pendingRevenue: number;
  overdueRevenue: number;
  totalExpenses: number;
  netProfit: number;
  utilizationRate: number;
}

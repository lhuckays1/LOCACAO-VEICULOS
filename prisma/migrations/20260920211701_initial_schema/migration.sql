-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR', 'FINANCIAL');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('PF', 'PJ');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'RENTED', 'MAINTENANCE', 'BLOCKED', 'SOLD');

-- CreateEnum
CREATE TYPE "MileageLogType" AS ENUM ('RENTAL_START', 'RENTAL_END', 'MAINTENANCE', 'MANUAL', 'FUEL');

-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'OVERDUE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'EMERGENCY', 'INSPECTION', 'OIL_CHANGE', 'TIRES', 'BRAKES', 'SUSPENSION', 'ELECTRICAL', 'ENGINE', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('OFICINA', 'PECAS', 'SERVICOS', 'OUTROS');

-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('CHECKOUT', 'CHECKIN');

-- CreateEnum
CREATE TYPE "FineStatus" AS ENUM ('PENDING', 'PAID', 'REIMBURSED', 'CONTESTED');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('REPORTED', 'UNDER_ANALYSIS', 'IN_REPAIR', 'RESOLVED', 'INSURANCE_CLAIMED');

-- CreateEnum
CREATE TYPE "FinancialType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "FinancialOrigin" AS ENUM ('RENTAL', 'EXTRA_FEE', 'DAMAGE', 'FINE', 'MAINTENANCE', 'FUEL', 'INSURANCE', 'ACQUISITION', 'SALE', 'SALARY', 'TAX', 'OFFICE', 'OTHER');

-- CreateEnum
CREATE TYPE "FinancialStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'BOLETO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO', 'TRANSFERENCIA', 'OUTRO');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('SEMANAL', 'QUINZENAL', 'MENSAL', 'ANUAL');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('DASHBOARD_VIEW', 'CLIENTS_VIEW', 'CLIENTS_CREATE', 'CLIENTS_EDIT', 'CLIENTS_DELETE', 'VEHICLES_VIEW', 'VEHICLES_CREATE', 'VEHICLES_EDIT', 'VEHICLES_DELETE', 'RENTALS_VIEW', 'RENTALS_CREATE', 'RENTALS_EDIT', 'RENTALS_DELETE', 'FINANCIAL_VIEW', 'FINANCIAL_CREATE', 'FINANCIAL_EDIT', 'FINANCIAL_DELETE', 'MAINTENANCE_VIEW', 'MAINTENANCE_CREATE', 'MAINTENANCE_EDIT', 'MAINTENANCE_DELETE', 'FINES_VIEW', 'FINES_CREATE', 'FINES_EDIT', 'FINES_DELETE', 'INCIDENTS_VIEW', 'INCIDENTS_CREATE', 'INCIDENTS_EDIT', 'INCIDENTS_DELETE', 'INSPECTIONS_VIEW', 'INSPECTIONS_CREATE', 'INSPECTIONS_EDIT', 'INSPECTIONS_DELETE', 'REPORTS_VIEW', 'SETTINGS_VIEW', 'SETTINGS_MANAGE');

-- CreateEnum
CREATE TYPE "InterestType" AS ENUM ('DAILY', 'MONTHLY');

-- CreateTable
CREATE TABLE "billing_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 5,
    "interestEnabled" BOOLEAN NOT NULL DEFAULT true,
    "interestType" "InterestType" NOT NULL DEFAULT 'MONTHLY',
    "interestRate" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "fineEnabled" BOOLEAN NOT NULL DEFAULT true,
    "fineRate" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "fineOnce" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "logo" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "ClientType" NOT NULL DEFAULT 'PF',
    "name" TEXT NOT NULL,
    "cpfCnpj" TEXT NOT NULL,
    "rg" TEXT,
    "birthDate" TIMESTAMP(3),
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "email" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT,
    "neighborhood" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "driverLicense" TEXT,
    "driverLicenseCategory" TEXT,
    "driverLicenseExpiration" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "version" TEXT,
    "manufactureYear" INTEGER NOT NULL,
    "modelYear" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "fuel" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "vehicleType" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "renavam" TEXT,
    "chassis" TEXT,
    "engine" TEXT,
    "currentMileage" INTEGER NOT NULL DEFAULT 0,
    "power" TEXT,
    "displacement" TEXT,
    "passengerCapacity" INTEGER,
    "purchaseValue" DECIMAL(10,2),
    "purchaseDate" TIMESTAMP(3),
    "dailyRate" DECIMAL(10,2) NOT NULL,
    "weeklyRate" DECIMAL(10,2) NOT NULL,
    "biweeklyRate" DECIMAL(10,2),
    "monthlyRate" DECIMAL(10,2) NOT NULL,
    "mileageAllowance" INTEGER NOT NULL DEFAULT 0,
    "excessMileageRate" DECIMAL(10,2) NOT NULL DEFAULT 0.50,
    "nextMaintenanceDate" TIMESTAMP(3),
    "insuranceProvider" TEXT,
    "insuranceExpiration" TIMESTAMP(3),
    "tracker" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_mileages" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "mileage" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "MileageLogType" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_mileages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rentals" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "rentalNumber" TEXT NOT NULL,
    "codigoContrato" TEXT,
    "clientId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "actualEndDate" TIMESTAMP(3),
    "billingFrequency" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "valorPeriodo" DECIMAL(10,2),
    "dueDay" INTEGER NOT NULL DEFAULT 5,
    "quantidadePeriodos" INTEGER NOT NULL DEFAULT 1,
    "depositAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "caucaoRecebida" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "statusCaucao" TEXT NOT NULL DEFAULT 'PENDENTE',
    "mileageAllowance" INTEGER NOT NULL DEFAULT 0,
    "excessMileageRate" DECIMAL(10,2) NOT NULL DEFAULT 0.50,
    "initialMileage" INTEGER NOT NULL DEFAULT 0,
    "finalMileage" INTEGER,
    "valorTotalPrevisto" DECIMAL(10,2),
    "desconto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "acrescimos" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valorFinal" DECIMAL(10,2),
    "initialFuelLevel" TEXT NOT NULL DEFAULT 'CHEIO (1/1)',
    "finalFuelLevel" TEXT,
    "status" "RentalStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rentals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_payments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "numeroParcela" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "dataVencimento" TEXT NOT NULL,
    "dataPagamento" TEXT,
    "formaPagamento" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "contractNumber" TEXT NOT NULL,
    "rentalId" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "terms" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3),
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "rentalId" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidDate" TIMESTAMP(3),
    "amount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2),
    "paymentMethod" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "receiptUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PAID',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenances" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tenantId" TEXT,
    "codigo" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL DEFAULT 'PREVENTIVE',
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'SCHEDULED',
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "kmEntrada" INTEGER NOT NULL,
    "kmConclusao" INTEGER,
    "dataAgendamento" TIMESTAMP(3) NOT NULL,
    "dataInicio" TIMESTAMP(3),
    "dataConclusao" TIMESTAMP(3),
    "custoPecas" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "custoMaoDeObra" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "custoOutros" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "custoTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "supplierId" TEXT,
    "workshopId" TEXT,
    "workshop" TEXT,
    "financialTransactionId" TEXT,
    "observacoes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_services" (
    "id" TEXT NOT NULL,
    "maintenanceId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "valorUnitario" DECIMAL(10,2) NOT NULL,
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_parts" (
    "id" TEXT NOT NULL,
    "maintenanceId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT,
    "quantidade" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "valorUnitario" DECIMAL(10,2) NOT NULL,
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_parts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_plans" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tenantId" TEXT,
    "vehicleId" TEXT,
    "nomeServico" TEXT NOT NULL,
    "descricao" TEXT,
    "intervaloKm" INTEGER,
    "ultimaKm" INTEGER,
    "proximaKm" INTEGER,
    "intervaloDias" INTEGER,
    "ultimaData" TIMESTAMP(3),
    "proximaData" TIMESTAMP(3),
    "alertaKmFaltando" INTEGER DEFAULT 1000,
    "alertaDiasFaltando" INTEGER DEFAULT 15,
    "status" TEXT NOT NULL DEFAULT 'ATIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workshops" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tenantId" TEXT,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "endereco" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workshops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "tenantId" TEXT,
    "nome" TEXT NOT NULL,
    "tipo" "SupplierType" NOT NULL DEFAULT 'OFICINA',
    "cpfCnpj" TEXT,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "endereco" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "rentalId" TEXT,
    "vehicleId" TEXT NOT NULL,
    "clientId" TEXT,
    "type" "InspectionType" NOT NULL DEFAULT 'CHECKOUT',
    "mileage" INTEGER NOT NULL,
    "fuelLevel" TEXT NOT NULL DEFAULT 'FULL',
    "notes" TEXT,
    "itemsJson" TEXT,
    "photosJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fines" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "clientId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "FineStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "clientId" TEXT,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'REPORTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldData" TEXT,
    "newData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_categories" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FinancialType" NOT NULL,
    "description" TEXT,
    "color" TEXT DEFAULT '#10B981',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_centers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_transactions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "FinancialType" NOT NULL,
    "origin" "FinancialOrigin" NOT NULL DEFAULT 'OTHER',
    "description" TEXT NOT NULL,
    "categoryId" TEXT,
    "costCenterId" TEXT,
    "clientId" TEXT,
    "vehicleId" TEXT,
    "rentalId" TEXT,
    "rentalPaymentId" TEXT,
    "maintenanceId" TEXT,
    "recurringId" TEXT,
    "grossAmount" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "interestAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(10,2) NOT NULL,
    "paidAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(10,2) NOT NULL,
    "competencyDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "settlementDate" TIMESTAMP(3),
    "paymentMethod" "PaymentMethod",
    "status" "FinancialStatus" NOT NULL DEFAULT 'PENDING',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "installmentNumber" INTEGER,
    "totalInstallments" INTEGER,
    "receiptUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_settlements" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "interest" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "fine" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "receiptUrl" TEXT,
    "notes" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_transactions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "FinancialType" NOT NULL,
    "origin" "FinancialOrigin" NOT NULL DEFAULT 'OTHER',
    "description" TEXT NOT NULL,
    "categoryId" TEXT,
    "costCenterId" TEXT,
    "clientId" TEXT,
    "vehicleId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "frequency" "RecurringFrequency" NOT NULL DEFAULT 'MENSAL',
    "dayOfDue" INTEGER NOT NULL DEFAULT 10,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastGeneratedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_permissions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" "Permission" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "platformName" TEXT NOT NULL DEFAULT 'FROTA CONTROL',
    "platformShortName" TEXT NOT NULL DEFAULT 'FROTA',
    "logo" TEXT,
    "supportEmail" TEXT,
    "country" TEXT NOT NULL DEFAULT 'BR',
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "minimumPasswordLength" INTEGER NOT NULL DEFAULT 8,
    "requireStrongPassword" BOOLEAN NOT NULL DEFAULT true,
    "sessionDurationMinutes" INTEGER NOT NULL DEFAULT 480,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "allowRegistration" BOOLEAN NOT NULL DEFAULT false,
    "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_settings_companyId_key" ON "billing_settings"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "companies_document_key" ON "companies"("document");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_companyId_idx" ON "users"("companyId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "clients_companyId_idx" ON "clients"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "clients_companyId_cpfCnpj_key" ON "clients"("companyId", "cpfCnpj");

-- CreateIndex
CREATE INDEX "vehicles_companyId_idx" ON "vehicles"("companyId");

-- CreateIndex
CREATE INDEX "vehicles_status_idx" ON "vehicles"("status");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_companyId_plate_key" ON "vehicles"("companyId", "plate");

-- CreateIndex
CREATE INDEX "vehicle_mileages_vehicleId_idx" ON "vehicle_mileages"("vehicleId");

-- CreateIndex
CREATE INDEX "rentals_companyId_idx" ON "rentals"("companyId");

-- CreateIndex
CREATE INDEX "rentals_clientId_idx" ON "rentals"("clientId");

-- CreateIndex
CREATE INDEX "rentals_vehicleId_idx" ON "rentals"("vehicleId");

-- CreateIndex
CREATE INDEX "rentals_status_idx" ON "rentals"("status");

-- CreateIndex
CREATE UNIQUE INDEX "rentals_companyId_rentalNumber_key" ON "rentals"("companyId", "rentalNumber");

-- CreateIndex
CREATE INDEX "rental_payments_tenantId_idx" ON "rental_payments"("tenantId");

-- CreateIndex
CREATE INDEX "rental_payments_rentalId_idx" ON "rental_payments"("rentalId");

-- CreateIndex
CREATE INDEX "contracts_companyId_idx" ON "contracts"("companyId");

-- CreateIndex
CREATE INDEX "contracts_rentalId_idx" ON "contracts"("rentalId");

-- CreateIndex
CREATE INDEX "payments_companyId_idx" ON "payments"("companyId");

-- CreateIndex
CREATE INDEX "payments_rentalId_idx" ON "payments"("rentalId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "expenses_companyId_idx" ON "expenses"("companyId");

-- CreateIndex
CREATE INDEX "expenses_vehicleId_idx" ON "expenses"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "maintenances_financialTransactionId_key" ON "maintenances"("financialTransactionId");

-- CreateIndex
CREATE INDEX "maintenances_companyId_idx" ON "maintenances"("companyId");

-- CreateIndex
CREATE INDEX "maintenances_vehicleId_idx" ON "maintenances"("vehicleId");

-- CreateIndex
CREATE INDEX "maintenances_status_idx" ON "maintenances"("status");

-- CreateIndex
CREATE UNIQUE INDEX "maintenances_companyId_codigo_key" ON "maintenances"("companyId", "codigo");

-- CreateIndex
CREATE INDEX "maintenance_services_maintenanceId_idx" ON "maintenance_services"("maintenanceId");

-- CreateIndex
CREATE INDEX "maintenance_parts_maintenanceId_idx" ON "maintenance_parts"("maintenanceId");

-- CreateIndex
CREATE INDEX "maintenance_plans_companyId_idx" ON "maintenance_plans"("companyId");

-- CreateIndex
CREATE INDEX "maintenance_plans_vehicleId_idx" ON "maintenance_plans"("vehicleId");

-- CreateIndex
CREATE INDEX "workshops_companyId_idx" ON "workshops"("companyId");

-- CreateIndex
CREATE INDEX "suppliers_companyId_idx" ON "suppliers"("companyId");

-- CreateIndex
CREATE INDEX "inspections_companyId_idx" ON "inspections"("companyId");

-- CreateIndex
CREATE INDEX "inspections_vehicleId_idx" ON "inspections"("vehicleId");

-- CreateIndex
CREATE INDEX "fines_companyId_idx" ON "fines"("companyId");

-- CreateIndex
CREATE INDEX "fines_vehicleId_idx" ON "fines"("vehicleId");

-- CreateIndex
CREATE INDEX "fines_clientId_idx" ON "fines"("clientId");

-- CreateIndex
CREATE INDEX "incidents_companyId_idx" ON "incidents"("companyId");

-- CreateIndex
CREATE INDEX "incidents_vehicleId_idx" ON "incidents"("vehicleId");

-- CreateIndex
CREATE INDEX "incidents_clientId_idx" ON "incidents"("clientId");

-- CreateIndex
CREATE INDEX "audit_logs_companyId_idx" ON "audit_logs"("companyId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs"("entity");

-- CreateIndex
CREATE INDEX "financial_categories_companyId_idx" ON "financial_categories"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_categories_companyId_name_type_key" ON "financial_categories"("companyId", "name", "type");

-- CreateIndex
CREATE INDEX "cost_centers_companyId_idx" ON "cost_centers"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_companyId_code_key" ON "cost_centers"("companyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_rentalPaymentId_key" ON "financial_transactions"("rentalPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_maintenanceId_key" ON "financial_transactions"("maintenanceId");

-- CreateIndex
CREATE INDEX "financial_transactions_companyId_idx" ON "financial_transactions"("companyId");

-- CreateIndex
CREATE INDEX "financial_transactions_type_idx" ON "financial_transactions"("type");

-- CreateIndex
CREATE INDEX "financial_transactions_status_idx" ON "financial_transactions"("status");

-- CreateIndex
CREATE INDEX "financial_transactions_dueDate_idx" ON "financial_transactions"("dueDate");

-- CreateIndex
CREATE INDEX "financial_transactions_origin_idx" ON "financial_transactions"("origin");

-- CreateIndex
CREATE INDEX "financial_transactions_clientId_idx" ON "financial_transactions"("clientId");

-- CreateIndex
CREATE INDEX "financial_transactions_vehicleId_idx" ON "financial_transactions"("vehicleId");

-- CreateIndex
CREATE INDEX "financial_transactions_rentalId_idx" ON "financial_transactions"("rentalId");

-- CreateIndex
CREATE INDEX "financial_transactions_maintenanceId_idx" ON "financial_transactions"("maintenanceId");

-- CreateIndex
CREATE INDEX "financial_settlements_companyId_idx" ON "financial_settlements"("companyId");

-- CreateIndex
CREATE INDEX "financial_settlements_transactionId_idx" ON "financial_settlements"("transactionId");

-- CreateIndex
CREATE INDEX "financial_settlements_paymentDate_idx" ON "financial_settlements"("paymentDate");

-- CreateIndex
CREATE INDEX "recurring_transactions_companyId_idx" ON "recurring_transactions"("companyId");

-- CreateIndex
CREATE INDEX "recurring_transactions_active_idx" ON "recurring_transactions"("active");

-- CreateIndex
CREATE INDEX "user_permissions_userId_idx" ON "user_permissions"("userId");

-- CreateIndex
CREATE INDEX "user_permissions_permission_idx" ON "user_permissions"("permission");

-- CreateIndex
CREATE UNIQUE INDEX "user_permissions_userId_permission_key" ON "user_permissions"("userId", "permission");

-- AddForeignKey
ALTER TABLE "billing_settings" ADD CONSTRAINT "billing_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_mileages" ADD CONSTRAINT "vehicle_mileages_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_payments" ADD CONSTRAINT "rental_payments_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenances" ADD CONSTRAINT "maintenances_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_services" ADD CONSTRAINT "maintenance_services_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "maintenances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_parts" ADD CONSTRAINT "maintenance_parts_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "maintenances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_plans" ADD CONSTRAINT "maintenance_plans_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workshops" ADD CONSTRAINT "workshops_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fines" ADD CONSTRAINT "fines_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_categories" ADD CONSTRAINT "financial_categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "financial_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_rentalId_fkey" FOREIGN KEY ("rentalId") REFERENCES "rentals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_rentalPaymentId_fkey" FOREIGN KEY ("rentalPaymentId") REFERENCES "rental_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "maintenances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_recurringId_fkey" FOREIGN KEY ("recurringId") REFERENCES "recurring_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_settlements" ADD CONSTRAINT "financial_settlements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_settlements" ADD CONSTRAINT "financial_settlements_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "financial_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_settlements" ADD CONSTRAINT "financial_settlements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "financial_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_permissions" ADD CONSTRAINT "user_permissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

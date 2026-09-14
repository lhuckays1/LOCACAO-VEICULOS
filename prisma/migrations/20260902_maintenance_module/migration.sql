-- Migration: 20260902_maintenance_module
-- FROTA CRM - Gestão de Manutenção de Frota

-- 1. Create Enums if not exists
DO $$ BEGIN
    CREATE TYPE "MaintenanceType" AS ENUM ('PREVENTIVE', 'CORRECTIVE', 'EMERGENCY', 'INSPECTION', 'OIL_CHANGE', 'TIRES', 'BRAKES', 'SUSPENSION', 'ELECTRICAL', 'ENGINE', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MaintenanceStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SupplierType" AS ENUM ('OFICINA', 'PECAS', 'SERVICOS', 'OUTROS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Workshops Table
CREATE TABLE IF NOT EXISTS "workshops" (
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

    CONSTRAINT "workshops_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workshops_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "workshops_companyId_idx" ON "workshops"("companyId");

-- 3. Create Suppliers Table
CREATE TABLE IF NOT EXISTS "suppliers" (
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

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "suppliers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "suppliers_companyId_idx" ON "suppliers"("companyId");

-- 4. Create or Update Maintenances Table
CREATE TABLE IF NOT EXISTS "maintenances" (
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

    CONSTRAINT "maintenances_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "maintenances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "maintenances_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "maintenances_workshopId_fkey" FOREIGN KEY ("workshopId") REFERENCES "workshops"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "maintenances_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "maintenances_companyId_codigo_key" ON "maintenances"("companyId", "codigo");
CREATE INDEX IF NOT EXISTS "maintenances_companyId_idx" ON "maintenances"("companyId");
CREATE INDEX IF NOT EXISTS "maintenances_vehicleId_idx" ON "maintenances"("vehicleId");
CREATE INDEX IF NOT EXISTS "maintenances_status_idx" ON "maintenances"("status");

-- 5. Create Maintenance Services Table
CREATE TABLE IF NOT EXISTS "maintenance_services" (
    "id" TEXT NOT NULL,
    "maintenanceId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "valorUnitario" DECIMAL(10,2) NOT NULL,
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_services_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "maintenance_services_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "maintenances"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "maintenance_services_maintenanceId_idx" ON "maintenance_services"("maintenanceId");

-- 6. Create Maintenance Parts Table
CREATE TABLE IF NOT EXISTS "maintenance_parts" (
    "id" TEXT NOT NULL,
    "maintenanceId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT,
    "quantidade" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "valorUnitario" DECIMAL(10,2) NOT NULL,
    "valorTotal" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_parts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "maintenance_parts_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "maintenances"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "maintenance_parts_maintenanceId_idx" ON "maintenance_parts"("maintenanceId");

-- 7. Create Maintenance Plans Table (Planos Preventivos)
CREATE TABLE IF NOT EXISTS "maintenance_plans" (
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

    CONSTRAINT "maintenance_plans_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "maintenance_plans_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "maintenance_plans_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "maintenance_plans_companyId_idx" ON "maintenance_plans"("companyId");
CREATE INDEX IF NOT EXISTS "maintenance_plans_vehicleId_idx" ON "maintenance_plans"("vehicleId");

-- 8. Add maintenanceId to Financial Transactions
ALTER TABLE "financial_transactions" ADD COLUMN IF NOT EXISTS "maintenanceId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "financial_transactions_maintenanceId_key" ON "financial_transactions"("maintenanceId");
CREATE INDEX IF NOT EXISTS "financial_transactions_maintenanceId_idx" ON "financial_transactions"("maintenanceId");

ALTER TABLE "financial_transactions"
    ADD CONSTRAINT "financial_transactions_maintenanceId_fkey"
    FOREIGN KEY ("maintenanceId") REFERENCES "maintenances"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

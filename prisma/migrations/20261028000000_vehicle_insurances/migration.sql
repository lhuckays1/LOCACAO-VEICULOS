CREATE TABLE "vehicle_insurances" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "insurer" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "coverageType" TEXT NOT NULL,
    "totalPremium" DECIMAL(10,2) NOT NULL,
    "installmentCount" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "firstDueDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vehicle_insurances_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "financial_transactions" ADD COLUMN "insuranceId" TEXT;
CREATE INDEX "vehicle_insurances_companyId_idx" ON "vehicle_insurances"("companyId");
CREATE INDEX "vehicle_insurances_vehicleId_idx" ON "vehicle_insurances"("vehicleId");
CREATE INDEX "vehicle_insurances_status_idx" ON "vehicle_insurances"("status");
CREATE INDEX "financial_transactions_insuranceId_idx" ON "financial_transactions"("insuranceId");
ALTER TABLE "vehicle_insurances" ADD CONSTRAINT "vehicle_insurances_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vehicle_insurances" ADD CONSTRAINT "vehicle_insurances_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_insuranceId_fkey" FOREIGN KEY ("insuranceId") REFERENCES "vehicle_insurances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

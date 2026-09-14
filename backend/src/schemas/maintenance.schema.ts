import { z } from 'zod';

export const maintenanceTypeEnum = z.enum([
  'PREVENTIVE',
  'CORRECTIVE',
  'EMERGENCY',
  'INSPECTION',
  'OIL_CHANGE',
  'TIRES',
  'BRAKES',
  'SUSPENSION',
  'ELECTRICAL',
  'ENGINE',
  'OTHER',
]);

export const maintenanceStatusEnum = z.enum([
  'SCHEDULED',
  'IN_PROGRESS',
  'WAITING_PARTS',
  'COMPLETED',
  'CANCELLED',
]);

export const supplierTypeEnum = z.enum([
  'OFICINA',
  'PECAS',
  'SERVICOS',
  'OUTROS',
]);

export const maintenanceServiceSchema = z.object({
  descricao: z.string().min(2, 'Descrição do serviço é obrigatória'),
  quantidade: z.coerce.number().positive('Quantidade deve ser maior que zero').default(1),
  valorUnitario: z.coerce.number().min(0, 'Valor unitário não pode ser negativo'),
});

export const maintenancePartSchema = z.object({
  nome: z.string().min(2, 'Nome da peça é obrigatório'),
  codigo: z.string().optional().nullable(),
  quantidade: z.coerce.number().positive('Quantidade deve ser maior que zero').default(1),
  valorUnitario: z.coerce.number().min(0, 'Valor unitário não pode ser negativo'),
});

export const createMaintenanceSchema = z.object({
  vehicleId: z.string().uuid('ID do veículo inválido').or(z.string().min(1, 'Veículo é obrigatório')),
  type: maintenanceTypeEnum.default('PREVENTIVE'),
  status: maintenanceStatusEnum.optional().default('SCHEDULED'),
  titulo: z.string().min(3, 'Título é obrigatório (mínimo 3 caracteres)'),
  descricao: z.string().min(3, 'Descrição é obrigatória (mínimo 3 caracteres)'),
  kmEntrada: z.coerce.number().min(0, 'KM de entrada deve ser maior ou igual a zero'),
  dataAgendamento: z.string().min(1, 'Data de agendamento é obrigatória'),
  workshopId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  custoOutros: z.coerce.number().min(0).optional().default(0),
  observacoes: z.string().optional().nullable(),
  services: z.array(maintenanceServiceSchema).optional().default([]),
  parts: z.array(maintenancePartSchema).optional().default([]),
});

export const updateMaintenanceSchema = z.object({
  vehicleId: z.string().optional(),
  type: maintenanceTypeEnum.optional(),
  status: maintenanceStatusEnum.optional(),
  titulo: z.string().min(3).optional(),
  descricao: z.string().min(3).optional(),
  kmEntrada: z.coerce.number().min(0).optional(),
  kmConclusao: z.coerce.number().min(0).optional().nullable(),
  dataAgendamento: z.string().optional(),
  dataInicio: z.string().optional().nullable(),
  dataConclusao: z.string().optional().nullable(),
  workshopId: z.string().optional().nullable(),
  supplierId: z.string().optional().nullable(),
  custoOutros: z.coerce.number().min(0).optional(),
  observacoes: z.string().optional().nullable(),
});

export const completeMaintenanceSchema = z.object({
  kmConclusao: z.coerce.number().min(0, 'KM de conclusão é obrigatório'),
  dataConclusao: z.string().optional(),
  observacoes: z.string().optional().nullable(),
});

export const maintenancePlanSchema = z.object({
  vehicleId: z.string().optional().nullable(),
  nomeServico: z.string().min(3, 'Nome do serviço é obrigatório'),
  descricao: z.string().optional().nullable(),
  intervaloKm: z.coerce.number().positive().optional().nullable(),
  ultimaKm: z.coerce.number().min(0).optional().nullable(),
  proximaKm: z.coerce.number().positive().optional().nullable(),
  intervaloDias: z.coerce.number().positive().optional().nullable(),
  ultimaData: z.string().optional().nullable(),
  proximaData: z.string().optional().nullable(),
  alertaKmFaltando: z.coerce.number().positive().optional().default(1000),
  alertaDiasFaltando: z.coerce.number().positive().optional().default(15),
  status: z.enum(['ATIVO', 'INATIVO']).optional().default('ATIVO'),
});

export const workshopSchema = z.object({
  nome: z.string().min(3, 'Nome da oficina é obrigatório'),
  cnpj: z.string().optional().nullable(),
  telefone: z.string().min(8, 'Telefone é obrigatório'),
  email: z.string().email('E-mail inválido').optional().nullable().or(z.literal('')),
  endereco: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  uf: z.string().max(2).optional().nullable(),
  observacoes: z.string().optional().nullable(),
  ativo: z.boolean().optional().default(true),
});

export const supplierSchema = z.object({
  nome: z.string().min(3, 'Nome do fornecedor é obrigatório'),
  tipo: supplierTypeEnum.optional().default('OFICINA'),
  cpfCnpj: z.string().optional().nullable(),
  telefone: z.string().min(8, 'Telefone é obrigatório'),
  email: z.string().email('E-mail inválido').optional().nullable().or(z.literal('')),
  endereco: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  ativo: z.boolean().optional().default(true),
});

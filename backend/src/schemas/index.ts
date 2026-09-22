import { z } from 'zod';
import { validateCPF, validateCNPJ, validatePlate, validateCEP, validatePhone } from '../utils/validators.js';

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'A senha é obrigatória'),
  companyName: z.string().min(2, 'Nome da empresa é obrigatório'),
  document: z.string().refine((val) => validateCNPJ(val) || validateCPF(val), {
    message: 'CPF ou CNPJ inválido',
  }),
  phone: z.string().min(10, 'Telefone inválido'),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Token de atualização obrigatório'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(1, 'Nova senha é obrigatória'),
});

export const clientSchema = z.object({
  type: z.enum(['PF', 'PJ']).default('PF'),
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres'),
  cpfCnpj: z.string().refine(
    (val) => {
      const clean = val.replace(/\D/g, '');
      if (clean.length === 11) return validateCPF(clean);
      if (clean.length === 14) return validateCNPJ(clean);
      return false;
    },
    { message: 'CPF ou CNPJ com dígitos verificadores inválidos' }
  ),
  rg: z.string().optional().nullable(),
  birthDate: z.string().optional().nullable(),
  phone: z.string().refine(validatePhone, { message: 'Telefone inválido (mínimo 10 dígitos com DDD)' }),
  whatsapp: z.string().optional().nullable(),
  email: z.string().email('Email do cliente inválido'),
  zipCode: z.string().refine(validateCEP, { message: 'CEP inválido (8 dígitos)' }),
  street: z.string().min(2, 'Logradouro é obrigatório'),
  number: z.string().min(1, 'Número do endereço é obrigatório'),
  complement: z.string().optional().nullable(),
  neighborhood: z.string().min(2, 'Bairro é obrigatório'),
  city: z.string().min(2, 'Cidade é obrigatória'),
  state: z.string().min(2, 'Estado (UF) é obrigatório').max(2, 'UF deve ter 2 letras'),
  driverLicense: z.string().optional().nullable(),
  driverLicenseCategory: z.string().optional().nullable(),
  driverLicenseExpiration: z.string().optional().nullable(),
  active: z.boolean().default(true),
  notes: z.string().optional().nullable(),
});

export const vehicleSchema = z.object({
  plate: z.string().refine(validatePlate, {
    message: 'Placa inválida. Use o formato Mercosul (ABC1D23) ou tradicional (ABC-1234)',
  }),
  brand: z.string().min(2, 'Marca é obrigatória'),
  model: z.string().min(1, 'Modelo é obrigatório'),
  version: z.string().optional().nullable(),
  manufactureYear: z.coerce.number().int().min(1980, 'Ano de fabricação inválido').max(2035),
  modelYear: z.coerce.number().int().min(1980, 'Ano do modelo inválido').max(2036),
  color: z.string().min(2, 'Cor é obrigatória'),
  fuel: z.string().default('FLEX'),
  category: z.string().min(2, 'Categoria é obrigatória'),
  vehicleType: z.string().optional().nullable(),
  status: z.enum(['AVAILABLE', 'RESERVED', 'RENTED', 'MAINTENANCE', 'BLOCKED', 'SOLD']).default('AVAILABLE'),
  renavam: z.string().optional().nullable(),
  chassis: z.string().optional().nullable(),
  engine: z.string().optional().nullable(),
  currentMileage: z.coerce.number().int().nonnegative('Quilometragem não pode ser negativa').default(0),
  power: z.string().optional().nullable(),
  displacement: z.string().optional().nullable(),
  passengerCapacity: z.coerce.number().int().optional().nullable(),
  purchaseValue: z.coerce.number().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  dailyRate: z.coerce.number().positive('Diária deve ser maior que zero'),
  weeklyRate: z.coerce.number().positive('Valor semanal deve ser maior que zero'),
  biweeklyRate: z.coerce.number().optional().nullable(),
  monthlyRate: z.coerce.number().positive('Valor mensal deve ser maior que zero'),
  mileageAllowance: z.coerce.number().int().nonnegative().default(0),
  excessMileageRate: z.coerce.number().nonnegative().default(0.50),
  nextMaintenanceDate: z.string().optional().nullable(),
  insuranceProvider: z.string().optional().nullable(),
  insuranceExpiration: z.string().optional().nullable(),
  tracker: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const rentalSchema = z.object({
  clienteId: z.string().optional(),
  clientId: z.string().optional(),
  veiculoId: z.string().optional(),
  vehicleId: z.string().optional(),
  dataInicio: z.string().optional(),
  startDate: z.string().optional(),
  dataFimPrevista: z.string().optional(),
  endDate: z.string().optional(),
  tipoCobranca: z
    .enum(['DIARIA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'])
    .default('SEMANAL'),
  billingFrequency: z.string().optional(),
  valorPeriodo: z.coerce.number().optional(),
  amount: z.coerce.number().optional(),
  diaVencimento: z.coerce.number().int().min(1).max(31).default(5),
  dueDay: z.coerce.number().int().min(1).max(31).optional(),
  quantidadePeriodos: z.coerce.number().int().positive().default(1),
  valorCaucao: z.coerce.number().nonnegative().optional(),
  depositAmount: z.coerce.number().nonnegative().optional(),
  statusCaucao: z.enum(['PENDENTE', 'PARCIAL', 'RECEBIDA', 'DEVOLVIDA']).default('PENDENTE'),
  caucaoRecebida: z.coerce.number().nonnegative().default(0),
  kmInicial: z.coerce.number().int().nonnegative().optional(),
  initialMileage: z.coerce.number().int().nonnegative().optional(),
  franquiaKm: z.coerce.number().int().nonnegative().optional(),
  mileageAllowance: z.coerce.number().int().nonnegative().optional(),
  valorKmExcedente: z.coerce.number().nonnegative().optional(),
  excessMileageRate: z.coerce.number().nonnegative().optional(),
  valorTotalPrevisto: z.coerce.number().optional(),
  desconto: z.coerce.number().nonnegative().default(0),
  acrescimos: z.coerce.number().nonnegative().default(0),
  valorFinal: z.coerce.number().optional(),
  status: z
    .enum([
      'RASCUNHO',
      'AGENDADA',
      'ATIVA',
      'FINALIZADA',
      'CANCELADA',
      'ATRASADA',
      'ACTIVE',
      'SCHEDULED',
      'DRAFT',
      'COMPLETED',
      'CANCELLED',
      'OVERDUE',
    ])
    .default('ATIVA'),
  initialFuelLevel: z.string().default('CHEIO (1/1)'),
  finalFuelLevel: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const payInstallmentSchema = z.object({
  valorPago: z.coerce
    .number()
    .positive('O valor pago deve ser maior que zero')
    .optional(),

  formaPagamento: z
    .string()
    .min(1, 'Forma de pagamento é obrigatória'),

  dataPagamento: z.string().optional(),

  observacoes: z
    .string()
    .optional()
    .nullable(),
});

export const updateCaucaoSchema = z.object({
  statusCaucao: z.enum(['PENDENTE', 'PARCIAL', 'RECEBIDA', 'DEVOLVIDA']),
  caucaoRecebida: z.coerce.number().nonnegative(),
  observacoes: z.string().optional().nullable(),
});

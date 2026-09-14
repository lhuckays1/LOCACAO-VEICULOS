import { z } from 'zod';

export const createFinancialTransactionSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  origin: z
    .enum([
      'RENTAL',
      'EXTRA_FEE',
      'DAMAGE',
      'FINE',
      'MAINTENANCE',
      'FUEL',
      'INSURANCE',
      'ACQUISITION',
      'SALE',
      'SALARY',
      'TAX',
      'OFFICE',
      'OTHER',
    ])
    .default('OTHER'),
  description: z.string().min(3, 'A descrição deve ter pelo menos 3 caracteres'),
  categoryId: z.string().optional().nullable(),
  costCenterId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  vehicleId: z.string().optional().nullable(),
  rentalId: z.string().optional().nullable(),
  rentalPaymentId: z.string().optional().nullable(),
  grossAmount: z.number().positive('O valor bruto deve ser positivo'),
  discountAmount: z.number().min(0).default(0).optional(),
  interestAmount: z.number().min(0).default(0).optional(),
  competencyDate: z.string().optional(),
  dueDate: z.string().min(10, 'Data de vencimento obrigatória'),
  paymentMethod: z
    .enum(['PIX', 'BOLETO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO', 'TRANSFERENCIA', 'OUTRO'])
    .default('PIX')
    .optional(),
  isRecurring: z.boolean().default(false).optional(),
  installmentNumber: z.number().int().positive().optional().nullable(),
  totalInstallments: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateFinancialTransactionSchema = z.object({
  description: z.string().min(3).optional(),
  categoryId: z.string().optional().nullable(),
  costCenterId: z.string().optional().nullable(),
  dueDate: z.string().min(10).optional(),
  paymentMethod: z
    .enum(['PIX', 'BOLETO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO', 'TRANSFERENCIA', 'OUTRO'])
    .optional(),
  notes: z.string().optional().nullable(),
});

export const settleTransactionSchema = z.object({
  amount: z.number().positive('O valor pago deve ser maior que zero'),
  paymentDate: z.string().min(10, 'Data do pagamento obrigatória'),
  paymentMethod: z.enum([
    'PIX',
    'BOLETO',
    'CARTAO_CREDITO',
    'CARTAO_DEBITO',
    'DINHEIRO',
    'TRANSFERENCIA',
    'OUTRO',
  ]),
  interest: z.number().min(0).default(0).optional(),
  fine: z.number().min(0).default(0).optional(),
  discount: z.number().min(0).default(0).optional(),
  receiptUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const cancelTransactionSchema = z.object({
  reason: z.string().min(3, 'Informe o motivo do cancelamento').optional(),
});

export const financialCategorySchema = z.object({
  name: z.string().min(2, 'O nome da categoria é obrigatório'),
  type: z.enum(['INCOME', 'EXPENSE']),
  description: z.string().optional().nullable(),
  color: z.string().optional().default('#10B981'),
});

export const costCenterSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório'),
  name: z.string().min(2, 'Nome do centro de custo é obrigatório'),
  description: z.string().optional().nullable(),
});

import React from 'react';
import { cn } from './Button';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: string;
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', children, ...props }) => {
  const variantStyles: Record<string, string> = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',

    // Vehicle Status Badges
    AVAILABLE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    DISPONIVEL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    RENTED: 'bg-blue-50 text-blue-700 border-blue-200',
    ALUGADO: 'bg-blue-50 text-blue-700 border-blue-200',
    MAINTENANCE: 'bg-amber-50 text-amber-700 border-amber-200',
    MANUTENCAO: 'bg-amber-50 text-amber-700 border-amber-200',
    BLOCKED: 'bg-rose-50 text-rose-700 border-rose-200',
    BLOQUEADO: 'bg-rose-50 text-rose-700 border-rose-200',
    RESERVED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    RESERVADO: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    SOLD: 'bg-slate-200 text-slate-700 border-slate-300',
    VENDIDO: 'bg-slate-200 text-slate-700 border-slate-300',

    // Rental & Payment Badges
    ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    ATIVA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    COMPLETED: 'bg-slate-100 text-slate-700 border-slate-200',
    FINALIZADA: 'bg-slate-100 text-slate-700 border-slate-200',
    CANCELLED: 'bg-rose-50 text-rose-700 border-rose-200',
    CANCELADA: 'bg-rose-50 text-rose-700 border-rose-200',
    CANCELADO: 'bg-rose-50 text-rose-700 border-rose-200',
    OVERDUE: 'bg-rose-50 text-rose-700 border-rose-200',
    ATRASADA: 'bg-rose-50 text-rose-700 border-rose-200',
    ATRASADO: 'bg-rose-50 text-rose-700 border-rose-200',
    SCHEDULED: 'bg-sky-50 text-sky-700 border-sky-200',
    AGENDADA: 'bg-sky-50 text-sky-700 border-sky-200',
    DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
    RASCUNHO: 'bg-slate-100 text-slate-600 border-slate-200',

    PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PAGO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    PENDENTE: 'bg-amber-50 text-amber-700 border-amber-200',

    RECEBIDA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    DEVOLVIDA: 'bg-slate-100 text-slate-700 border-slate-200',
    PARCIAL: 'bg-purple-50 text-purple-700 border-purple-200',

    APROVADO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    COM_RESSALVAS: 'bg-amber-50 text-amber-700 border-amber-200',
    RECUSADO: 'bg-rose-50 text-rose-700 border-rose-200',

    // Client Types
    PF: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    PJ: 'bg-teal-50 text-teal-700 border-teal-200',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap',
        variantStyles[variant] || variantStyles.default,
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

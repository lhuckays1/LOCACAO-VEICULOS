import React, { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from './Button';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

interface ToastContextType {
  toast: (options: Omit<ToastMessage, 'id'>) => void;
  addToast: (options: { type: ToastMessage['type'] | 'danger'; title: string; message?: string }) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(({ type, title, message }: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => toast({ type: 'success', title, message }), [toast]);
  const error = useCallback((title: string, message?: string) => toast({ type: 'error', title, message }), [toast]);
  const warning = useCallback((title: string, message?: string) => toast({ type: 'warning', title, message }), [toast]);
  const info = useCallback((title: string, message?: string) => toast({ type: 'info', title, message }), [toast]);
  const addToast: ToastContextType['addToast'] = useCallback((options) =>
    toast({ ...options, type: options.type === 'danger' ? 'error' : options.type }), [toast]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600" />,
    info: <Info className="w-5 h-5 text-sky-600" />,
  };

  const borders = {
    success: 'border-emerald-200 bg-emerald-50/90 text-emerald-950',
    error: 'border-rose-200 bg-rose-50/90 text-rose-950',
    warning: 'border-amber-200 bg-amber-50/90 text-amber-950',
    info: 'border-sky-200 bg-sky-50/90 text-sky-950',
  };

  return (
    <ToastContext.Provider value={{ toast, addToast, success, error, warning, info }}>
      {children}
      {/* Toast Floating Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2',
              borders[t.type]
            )}
          >
            <div className="shrink-0 mt-0.5">{icons[t.type]}</div>
            <div className="flex-1 min-w-0">
              <h4 className="text-base font-bold">{t.title}</h4>
              {t.message && <p className="text-sm opacity-90 mt-1">{t.message}</p>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              aria-label="Fechar notificação"
              className="min-h-11 min-w-11 shrink-0 p-2 opacity-70 hover:opacity-100 rounded-md transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

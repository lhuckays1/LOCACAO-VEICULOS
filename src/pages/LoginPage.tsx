import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import { maskCPFOrCNPJ, maskPhone } from '../utils/formatters';
import { Car, Lock, Mail, Building2, UserCheck, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register Form State
  const [companyName, setCompanyName] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const [adminName, setAdminName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toastError('Preencha todos os campos', 'Informe seu e-mail e senha.');
      return;
    }

    setIsLoading(true);
    try {
      await login(loginEmail, loginPassword);
      toastSuccess('Autenticado com sucesso!', 'Bem-vindo ao FROTA CRM.');
    } catch (err: any) {
      toastError('Erro no login', err.message || 'Credenciais inválidas.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !document || !adminName || !registerEmail || !registerPassword) {
      toastError('Preencha os campos obrigatórios', 'Todos os campos são necessários.');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        companyName,
        document,
        phone: phone || '11999999999',
        name: adminName,
        email: registerEmail,
        password: registerPassword,
      });
      toastSuccess('Cadastro realizado!', 'Empresa e administrador configurados com sucesso.');
    } catch (err: any) {
      toastError('Erro no cadastro', err.message || 'Verifique os dados informados.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 text-slate-100 antialiased font-sans">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-xl shadow-emerald-950/50 mb-4 ring-4 ring-emerald-500/20">
            <Car className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            FROTA <span className="text-emerald-400">CRM</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase font-semibold tracking-widest">
            Sistema Profissional de Gestão de Locação de Veículos
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-6 sm:p-8 shadow-2xl">
          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl mb-6 border border-slate-800">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ENTRAR
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              NOVA EMPRESA
            </button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <Input
                  label="E-MAIL DE ACESSO"
                  type="email"
                  placeholder="admin@frotacrm.com.br"
                  value={loginEmail}
                  autoUppercase={false}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  icon={<Mail className="w-4 h-4" />}
                  required
                />
              </div>

              <div>
                <Input
                  label="SENHA"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  autoUppercase={false}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  icon={<Lock className="w-4 h-4" />}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full h-11 text-sm font-bold mt-2"
                isLoading={isLoading}
              >
                Acessar Painel Operacional
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <Input
                label="NOME DA LOCADORA / EMPRESA"
                placeholder="EX: PRIME RENT A CAR"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                icon={<Building2 className="w-4 h-4" />}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="CNPJ OU CPF"
                  placeholder="00.000.000/0000-00"
                  value={maskCPFOrCNPJ(document)}
                  onChange={(e) => setDocument(e.target.value)}
                  required
                />
                <Input
                  label="TELEFONE DE CONTATO"
                  placeholder="(11) 98765-4321"
                  value={maskPhone(phone)}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <Input
                label="NOME DO ADMINISTRADOR"
                placeholder="SEU NOME COMPLETO"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                icon={<UserCheck className="w-4 h-4" />}
                required
              />

              <Input
                label="E-MAIL ADMINISTRATIVO"
                type="email"
                placeholder="contato@suaempresa.com.br"
                value={registerEmail}
                autoUppercase={false}
                onChange={(e) => setRegisterEmail(e.target.value)}
                icon={<Mail className="w-4 h-4" />}
                required
              />

              <Input
                label="SENHA DE ACESSO"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={registerPassword}
                autoUppercase={false}
                onChange={(e) => setRegisterPassword(e.target.value)}
                icon={<Lock className="w-4 h-4" />}
                required
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full h-11 text-sm font-bold mt-2"
                isLoading={isLoading}
              >
                Criar Conta Empresarial
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </form>
          )}

        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-slate-500">
          Frota CRM &copy; {new Date().getFullYear()} — Plataforma Escalável de Gestão de Frotas
        </div>
      </div>
    </div>
  );
};

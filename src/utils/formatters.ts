/**
 * Frontend Formatters, Masks and Document Checksum Verification
 */

export function unmask(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/[^a-zA-Z0-9]/g, '');
}

export function maskCPF(cpf: string | null | undefined): string {
  if (!cpf) return '';
  const clean = cpf.replace(/\D/g, '').slice(0, 11);
  return clean
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

export function maskCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return '';
  const clean = cnpj.replace(/\D/g, '').slice(0, 14);
  return clean
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function maskCPFOrCNPJ(doc: string | null | undefined): string {
  if (!doc) return '';
  const clean = doc.replace(/\D/g, '');
  if (clean.length > 11) {
    return maskCNPJ(clean);
  }
  return maskCPF(clean);
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '').slice(0, 11);
  if (clean.length > 10) {
    return clean.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }
  return clean.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
}

export function maskCEP(cep: string | null | undefined): string {
  if (!cep) return '';
  const clean = cep.replace(/\D/g, '').slice(0, 8);
  return clean.replace(/^(\d{5})(\d{1,3})$/, '$1-$2');
}

export function maskPlate(plate: string | null | undefined): string {
  if (!plate) return '';
  const clean = plate.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 7);
  if (clean.length <= 3) return clean;
  // Traditional format: ABC-1234
  if (/^[A-Z]{3}[0-9]{4}$/.test(clean)) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  return clean;
}

export function validatePlate(plateRaw: string | null | undefined): boolean {
  if (!plateRaw) return false;
  const clean = plateRaw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (clean.length !== 7) return false;
  const traditionalRegex = /^[A-Z]{3}[0-9]{4}$/;
  const mercosulRegex = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
  return traditionalRegex.test(clean) || mercosulRegex.test(clean);
}

export function maskRenavam(renavam: string | null | undefined): string {
  if (!renavam) return '';
  return renavam.replace(/\D/g, '').slice(0, 11);
}

export function maskCurrency(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return 'R$ 0,00';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

export function maskMileage(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '0 KM';
  const num = typeof val === 'string' ? parseInt(val, 10) : val;
  if (isNaN(num)) return '0 KM';
  return `${new Intl.NumberFormat('pt-BR').format(num)} KM`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('pt-BR').format(d);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
}

/**
 * Validates CPF with real checksum algorithm
 */
export function validateCPF(cpfRaw: string): boolean {
  if (!cpfRaw) return false;
  const cpf = cpfRaw.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (10 - i);
  }
  let firstDigit = (sum * 10) % 11;
  if (firstDigit === 10 || firstDigit === 11) firstDigit = 0;
  if (firstDigit !== parseInt(cpf.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (11 - i);
  }
  let secondDigit = (sum * 10) % 11;
  if (secondDigit === 10 || secondDigit === 11) secondDigit = 0;
  if (secondDigit !== parseInt(cpf.charAt(10), 10)) return false;

  return true;
}

/**
 * Validates CNPJ with real checksum algorithm
 */
export function validateCNPJ(cnpjRaw: string): boolean {
  if (!cnpjRaw) return false;
  const cnpj = cnpjRaw.replace(/\D/g, '');
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const weight1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj.charAt(i), 10) * weight1[i];
  }
  let rest = sum % 11;
  const firstDigit = rest < 2 ? 0 : 11 - rest;
  if (firstDigit !== parseInt(cnpj.charAt(12), 10)) return false;

  const weight2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj.charAt(i), 10) * weight2[i];
  }
  rest = sum % 11;
  const secondDigit = rest < 2 ? 0 : 11 - rest;
  if (secondDigit !== parseInt(cnpj.charAt(13), 10)) return false;

  return true;
}

/**
 * Automatically converts input values to uppercase except sensitive fields (email, password, etc.)
 */
export function handleUppercaseInput(name: string, value: string): string {
  const lowercaseKeys = ['email', 'password', 'confirmPassword', 'token', 'url'];
  if (lowercaseKeys.includes(name)) {
    return value;
  }
  return value.toUpperCase();
}

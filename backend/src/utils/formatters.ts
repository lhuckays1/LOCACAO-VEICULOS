/**
 * Brazilian Formatting Utilities & Case Normalization
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
  // Traditional format ABC-1234
  if (/^[A-Z]{3}[0-9]{4}$/.test(clean)) {
    return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  }
  // Mercosul format ABC1D23 (or partial)
  return clean;
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

/**
 * Keys that must NEVER be converted to uppercase
 */
const EXCLUDED_UPPERCASE_KEYS = new Set([
  'email',
  'password',
  'confirmPassword',
  'token',
  'refreshToken',
  'url',
  'fileUrl',
  'receiptUrl',
  'logo',
  'id',
  'companyId',
  'clientId',
  'vehicleId',
  'rentalId',
  'userId',
  'createdAt',
  'updatedAt',
]);

/**
 * Deeply transforms string values of an object to uppercase,
 * respecting excluded keys (such as email, password, URLs, tokens, IDs).
 */
export function deepTransformToUppercase<T>(data: T): T {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    return data.toUpperCase() as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => deepTransformToUppercase(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (EXCLUDED_UPPERCASE_KEYS.has(key)) {
        result[key] = value;
      } else if (typeof value === 'string') {
        result[key] = value.toUpperCase();
      } else if (typeof value === 'object' && value !== null) {
        result[key] = deepTransformToUppercase(value);
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }

  return data;
}

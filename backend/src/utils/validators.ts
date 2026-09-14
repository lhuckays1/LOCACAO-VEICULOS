/**
 * Brazilian Document & Format Validators
 * Implements strict algorithm for CPF and CNPJ checksum verification
 */

/**
 * Validates CPF with Modulo-11 checksums
 */
export function validateCPF(cpfRaw: string): boolean {
  if (!cpfRaw) return false;
  const cpf = cpfRaw.replace(/\D/g, '');

  if (cpf.length !== 11) return false;

  // Rejects known invalid sequences (e.g. 00000000000, 11111111111, etc.)
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  // Calculate 1st verification digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i), 10) * (10 - i);
  }
  let firstDigit = (sum * 10) % 11;
  if (firstDigit === 10 || firstDigit === 11) firstDigit = 0;
  if (firstDigit !== parseInt(cpf.charAt(9), 10)) return false;

  // Calculate 2nd verification digit
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
 * Validates CNPJ with Modulo-11 checksums
 */
export function validateCNPJ(cnpjRaw: string): boolean {
  if (!cnpjRaw) return false;
  const cnpj = cnpjRaw.replace(/\D/g, '');

  if (cnpj.length !== 14) return false;

  // Rejects known invalid sequences
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  // 1st digit calculation
  const weight1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj.charAt(i), 10) * weight1[i];
  }
  let rest = sum % 11;
  const firstDigit = rest < 2 ? 0 : 11 - rest;
  if (firstDigit !== parseInt(cnpj.charAt(12), 10)) return false;

  // 2nd digit calculation
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
 * Validates Brazilian vehicle plates (Traditional: ABC-1234, Mercosul: ABC1D23)
 */
export function validatePlate(plateRaw: string): boolean {
  if (!plateRaw) return false;
  const clean = plateRaw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (clean.length !== 7) return false;

  // Traditional pattern: 3 letters + 4 digits (e.g. ABC1234)
  const traditionalRegex = /^[A-Z]{3}[0-9]{4}$/;
  // Mercosul pattern: 3 letters + 1 digit + 1 letter + 2 digits (e.g. ABC1D23)
  const mercosulRegex = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

  return traditionalRegex.test(clean) || mercosulRegex.test(clean);
}

/**
 * Validates Brazilian Postal Code (CEP)
 */
export function validateCEP(cepRaw: string): boolean {
  if (!cepRaw) return false;
  const clean = cepRaw.replace(/\D/g, '');
  return clean.length === 8;
}

/**
 * Validates Brazilian Phone Number (Landline 10 digits or Mobile 11 digits)
 */
export function validatePhone(phoneRaw: string): boolean {
  if (!phoneRaw) return false;
  const clean = phoneRaw.replace(/\D/g, '');
  return clean.length === 10 || clean.length === 11;
}

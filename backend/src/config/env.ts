import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', quiet: true });
dotenv.config({ quiet: true });

export function requiredSecret(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 32) {
    throw new Error(`${name} deve conter pelo menos 32 caracteres aleatórios.`);
  }
  return value;
}

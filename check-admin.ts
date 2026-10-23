import './backend/src/config/env.js';
import { prisma } from './backend/src/config/prisma.js';
async function main() {
  if (!process.env.SUPER_ADMIN_EMAIL) throw new Error('Defina SUPER_ADMIN_EMAIL.');
  const user = await prisma.user.findUnique({ where: { email: process.env.SUPER_ADMIN_EMAIL }, select: { id: true, name: true, role: true, active: true } });
  console.log(user ?? 'Usuário não encontrado.');
}
main().catch(err => { console.error(err); process.exitCode = 1; }).finally(() => prisma.$disconnect());

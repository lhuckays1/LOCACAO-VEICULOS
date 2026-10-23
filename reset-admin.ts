import './backend/src/config/env.js';
import { prisma } from './backend/src/config/prisma.js';
import bcrypt from 'bcryptjs';
async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) throw new Error('Defina SUPER_ADMIN_EMAIL e SUPER_ADMIN_PASSWORD (mínimo 12 caracteres).');
  const user = await prisma.user.findFirst({ where: { email, role: 'SUPER_ADMIN' } });
  if (!user) throw new Error('SUPER_ADMIN não encontrado.');
  await prisma.$transaction(async tx => {
    await tx.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(password, 10) } });
    await tx.authSession.deleteMany({ where: { userId: user.id } });
  });
  console.log('Senha atualizada. As sessões anteriores foram encerradas.');
}
main().catch(err => { console.error(err); process.exitCode = 1; }).finally(() => prisma.$disconnect());

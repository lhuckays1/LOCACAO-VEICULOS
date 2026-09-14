import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email =
    process.env.SUPER_ADMIN_EMAIL ||
    'admin@fleetmaster.com';

  const password =
    process.env.SUPER_ADMIN_PASSWORD ||
    'Admin@123456';

  const name =
    process.env.SUPER_ADMIN_NAME ||
    'SUPER ADMINISTRADOR';

  const existingUser =
    await prisma.user.findUnique({
      where: {
        email,
      },
    });

  if (existingUser) {
    console.log(
      `⚠️ SUPER_ADMIN já existe: ${email}`
    );

    return;
  }

  const passwordHash =
    await bcrypt.hash(password, 10);

  const user =
    await prisma.user.create({
      data: {
        name: name.toUpperCase(),
        email: email.toLowerCase(),
        password: passwordHash,
        role: 'SUPER_ADMIN',
        active: true,
        companyId: null,
      },
    });

  console.log('');
  console.log('==========================================');
  console.log('🚀 SUPER ADMIN CRIADO COM SUCESSO');
  console.log('==========================================');
  console.log(`ID: ${user.id}`);
  console.log(`Nome: ${user.name}`);
  console.log(`Email: ${user.email}`);
  console.log(`Role: ${user.role}`);
  console.log('==========================================');
  console.log('');
}

main()
  .catch((error) => {
    console.error(
      '❌ Erro ao criar SUPER_ADMIN:',
      error
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
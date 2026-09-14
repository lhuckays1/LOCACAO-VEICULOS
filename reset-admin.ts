import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'lucassilvaluiz98@gmail.com';

  // Defina a nova senha
  const novaSenha = 'Juvenal#123';

  console.log('\n🔄 Redefinindo senha do SUPER_ADMIN...\n');

  const senhaHash = await bcrypt.hash(novaSenha, 10);

  const usuario = await prisma.user.update({
    where: {
      email,
    },
    data: {
      password: senhaHash,
      active: true,
      role: 'SUPER_ADMIN',
    },
  });

  console.log('==========================================');
  console.log('✅ SUPER ADMIN ATUALIZADO COM SUCESSO');
  console.log('==========================================');
  console.log(`Nome: ${usuario.name}`);
  console.log(`E-mail: ${usuario.email}`);
  console.log(`Perfil: ${usuario.role}`);
  console.log(`Ativo: ${usuario.active ? 'SIM' : 'NÃO'}`);
  console.log('');
  console.log('🔐 Nova senha definida: Admin@123456');
  console.log('==========================================\n');

  // Teste imediato do hash
  const teste = await bcrypt.compare(novaSenha, usuario.password);

  console.log(
    teste
      ? '✅ Hash validado com sucesso!'
      : '❌ ERRO: Hash não corresponde à senha!'
  );
}

main()
  .catch((error) => {
    console.error('\n❌ Erro ao atualizar usuário:');
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
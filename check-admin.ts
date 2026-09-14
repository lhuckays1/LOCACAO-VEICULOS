import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'lucassilvaluiz98@gmail.com';

  console.log('\n🔎 Procurando usuário...\n');

  const usuario = await prisma.user.findUnique({
    where: { email },
  });

  if (!usuario) {
    console.log('❌ USUÁRIO NÃO ENCONTRADO!');
    return;
  }

  console.log('✅ USUÁRIO ENCONTRADO:\n');

  console.log({
    id: usuario.id,
    nome: usuario.name,
    email: usuario.email,
    role: usuario.role,
    ativo: usuario.active,
  });

  console.log('\n🔐 Campos disponíveis no usuário:');
  console.log(Object.keys(usuario));

  const senhaTeste = 'Juvenal#123';

  // Detecta automaticamente o campo da senha
  const hash =
    (usuario as any).password ||
    (usuario as any).passwordHash ||
    (usuario as any).senha;

  if (!hash) {
    console.log('\n❌ NENHUM CAMPO DE SENHA ENCONTRADO!');
    return;
  }

  console.log('\n🔑 Hash encontrado:', hash.substring(0, 20) + '...');

  const senhaValida = await bcrypt.compare(senhaTeste, hash);

  console.log('\n🧪 Teste da senha Admin@123456:');
  console.log(senhaValida ? '✅ SENHA CORRETA' : '❌ SENHA INCORRETA');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
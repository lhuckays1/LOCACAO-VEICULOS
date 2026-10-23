# FROTA CRM

Sistema de gestão de locadoras com React, TypeScript, Express, Prisma e PostgreSQL.

## Execução local

Requisitos: Node.js 22 ou superior e PostgreSQL 16 ou superior.

1. Copie `.env.example` para `.env` e configure `DATABASE_URL` e `DIRECT_URL`.
   A segunda URL deve ser uma conexão direta para migrações.
2. Gere **dois segredos diferentes**, com pelo menos 32 caracteres cada:
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
   Configure `JWT_SECRET` e `JWT_REFRESH_SECRET` com os resultados.
3. Execute `npm ci` e `npm run prisma:deploy`.
4. Para criar o primeiro administrador global, defina `SUPER_ADMIN_EMAIL` e
   `SUPER_ADMIN_PASSWORD` (mínimo 12 caracteres), e execute `npx prisma db seed`.
   O seed preserva um administrador já existente. Para redefinir sua senha,
   execute `npx tsx reset-admin.ts` com essas variáveis configuradas.
5. Execute `npm run dev` e acesse `http://localhost:3000`.

O cadastro público é desativado por padrão. O administrador global pode cadastrar
empresas e administradores pelo painel. `.env.local`, quando presente, tem
precedência sobre `.env`; variáveis fornecidas pelo ambiente têm precedência sobre ambos.

## Produção

```sh
npm ci
npm run build
npm run prisma:deploy
npm start
```

O build gera `dist/public` (interface) e `dist/server.js` (servidor).
O comando de start não depende de tsx nem do servidor de desenvolvimento Vite.
Na Vercel, configure as mesmas variáveis. O comando `vercel-build` aplica as
migrações no ambiente de produção antes de gerar o build; previews não executam
migrações. Os segredos são validados antes de acessar o banco.

Se o banco já existir sem histórico do Prisma, o procedimento só registra a
baseline após confirmar que seu esquema corresponde exatamente ao esquema inicial
ou ao esquema completo atual. Qualquer divergência interrompe a publicação sem
recriar tabelas. Bancos com migrações incompletas exigem análise antes de continuar.
O processo valida ao final o histórico aplicado e a existência de `auth_sessions`.

### Docker Compose

Configure em `.env` `POSTGRES_PASSWORD`, `JWT_SECRET` e `JWT_REFRESH_SECRET`,
depois execute `docker compose up --build -d`.
Use uma senha do PostgreSQL sem caracteres reservados de URL neste exemplo.
O PostgreSQL fica acessível somente na rede interna do Compose; a aplicação
publica a porta 3000. O container executa as migrações antes de iniciar a aplicação.
Faça backup do banco existente antes de atualizar uma instalação.

## Atualização de instalações existentes

- A migração `20261023000000_auth_sessions` cria as sessões persistentes.
  Usuários com tokens anteriores precisam entrar novamente após a atualização.
- Os nomes válidos dos segredos são `JWT_SECRET` e `JWT_REFRESH_SECRET`.
  A aplicação recusa a inicialização sem segredos válidos e distintos.
- Troque senhas administrativas e segredos que tenham sido usados a partir dos
  exemplos antigos do repositório. Remover valores do código atual não os apaga do histórico Git.
- Logout revoga a sessão atual; troca ou redefinição de senha invalida as sessões
  anteriores. Desativação da conta/empresa e alteração de perfil são verificadas
  nas requisições protegidas. Refresh tokens são rotacionados e armazenados somente como hash.
- Financeiro e manutenção usam PostgreSQL em todas as rotas ativas.
  Dados antigos mantidos exclusivamente em memória não podem ser recuperados após
  encerrar o processo. Se houver dados nessa situação, exporte-os da instância
  antiga antes da atualização e confira sua importação no banco.
- Multas, sinistros e relatórios ainda não possuem implementação completa;
  suas telas informam que estão indisponíveis, sem exibir registros fictícios.

## Verificação

```sh
npm run lint
npm test
npm run build
```

Para integração, use **exclusivamente um banco descartável** cujo nome contenha `test`.
Configure `DATABASE_URL`, `DIRECT_URL` e `TEST_DATABASE_URL` para esse mesmo banco,
execute `npm run prisma:deploy` e `npm run test:integration`.
Os testes criam empresas isoladas e removem seus próprios registros ao terminar.

O CI executa validação de tipos, testes unitários e de integração, comparação de
esquema, build e construção da imagem Docker. A aplicação utiliza UTC para datas
financeiras sem horário; o frontend mantém a apresentação dessas datas.

As dependências transitivas com correções compatíveis foram atualizadas no lockfile.
O override de `deepmerge-ts` no CLI Prisma elimina a versão vulnerável sem migrar o
ORM para outra versão principal; geração do client e migrações fazem parte da validação.

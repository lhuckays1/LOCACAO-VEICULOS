# Correções aplicadas nesta versão

- Criada e registrada a rota `/api/maintenance`.
- Exportada instância singleton do `MaintenanceController`.
- Adicionada estrutura de rotas para manutenção, planos, oficinas e fornecedores.
- Adicionado Dockerfile para build/deploy.
- Adicionadas dependências e scripts do Prisma.

## Atenção
Esta versão corrige o problema de roteamento e preparação de infraestrutura, mas NÃO migra automaticamente os controllers do `store.ts` para Prisma/PostgreSQL. Essa migração deve ser feita como uma etapa própria para evitar perda ou inconsistência de regras de negócio.

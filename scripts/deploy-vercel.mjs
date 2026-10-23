import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const root = fileURLToPath(new URL('../', import.meta.url));
const cli = resolve(root, 'node_modules/prisma/build/index.js');
const initial = '20260920211701_initial_schema';
const sessions = '20261023000000_auth_sessions';

function redact(text) {
  for (const key of ['DATABASE_URL', 'DIRECT_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'SUPER_ADMIN_PASSWORD']) {
    if (process.env[key]) text = text.split(process.env[key]).join('[REDACTED]');
  }
  return text;
}

function prisma(args, allowed = [0]) {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8', env: process.env });
  const output = redact((result.stdout || '') + (result.stderr || ''));
  if (!allowed.includes(result.status)) throw new Error(`Prisma falhou (${result.status}):\n${output}`);
  return { status: result.status, output };
}

async function migrate() {
  const access = process.env.JWT_SECRET, refresh = process.env.JWT_REFRESH_SECRET;
  if (!access || !refresh || access.length < 32 || refresh.length < 32 || access === refresh)
    throw new Error('Configure JWT_SECRET e JWT_REFRESH_SECRET distintos, com pelo menos 32 caracteres.');
  if (!process.env.DIRECT_URL || !process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL e DIRECT_URL.');

  const client = new pg.Client({ connectionString: process.env.DIRECT_URL, connectionTimeoutMillis: 20000 });
  const temporary = resolve(root, 'prisma/.deploy-baseline.prisma');
  try {
    await client.connect();
    // Both legacy Vercel builders can execute vercel-build. Serialize their migrations.
    await client.query("SELECT pg_advisory_lock(hashtextextended('FROTA_CRM_DEPLOY', 0))");
    const { rows } = await client.query(`SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`);
    const tables = rows.map(row => row.table_name);
    const history = tables.includes('_prisma_migrations')
      ? (await client.query('SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations')).rows : [];
    if (history.some(row => !row.finished_at && !row.rolled_back_at))
      throw new Error('Existe uma migração incompleta. Inspecione-a antes de continuar.');

    if (!history.some(row => row.finished_at) && tables.some(name => name !== '_prisma_migrations')) {
      // A database created by db push needs a baseline. Never assume that its schema matches.
      const schema = readFileSync(resolve(root, 'prisma/schema.prisma'), 'utf8');
      const baseline = schema.replace(/^\s*sessions\s+AuthSession\[\].*$/m, '')
        .replace(/\nmodel AuthSession \{[\s\S]*?\n\}/, '');
      writeFileSync(temporary, baseline);
      const previous = prisma(['migrate', 'diff', '--from-url', process.env.DIRECT_URL,
        '--to-schema-datamodel', temporary, '--exit-code'], [0, 2]);
      if (previous.status === 0) {
        console.log('[DEPLOY] Esquema inicial existente confirmado; registrando baseline sem recriar tabelas.');
        console.log(prisma(['migrate', 'resolve', '--applied', initial]).output);
      } else {
        const current = prisma(['migrate', 'diff', '--from-url', process.env.DIRECT_URL,
          '--to-schema-datamodel', resolve(root, 'prisma/schema.prisma'), '--exit-code'], [0, 2]);
        if (current.status !== 0) throw new Error('O banco existente difere do esquema esperado. Nenhuma tabela foi alterada.\n' + previous.output);
        console.log('[DEPLOY] Esquema completo existente confirmado; registrando histórico sem alterar tabelas.');
        console.log(prisma(['migrate', 'resolve', '--applied', initial]).output);
        console.log(prisma(['migrate', 'resolve', '--applied', sessions]).output);
      }
    }
    console.log(prisma(['migrate', 'deploy']).output);
    const applied = await client.query('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name');
    const table = await client.query("SELECT to_regclass('public.auth_sessions') AS name");
    if (!table.rows[0].name || !applied.rows.some(row => row.migration_name === sessions))
      throw new Error('A migração de sessões não foi confirmada.');
    console.log('[DEPLOY] Migração confirmada: auth_sessions disponível; histórico atualizado.');
  } finally {
    try { unlinkSync(temporary); } catch {}
    await client.end().catch(() => {});
  }
}

try {
  if (process.env.VERCEL_ENV === 'production') await migrate();
  else console.log('[DEPLOY] Migrações de produção não são executadas em previews.');
  if (process.env.DEPLOY_MIGRATIONS_ONLY !== '1') {
    const build = spawnSync(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'build'], { cwd: root, stdio: 'inherit' });
    if (build.status !== 0) throw new Error('Falha ao gerar a interface.');
    await import('./build.mjs');
  }
} catch (error) {
  console.error(redact(error.message));
  process.exitCode = 1;
}

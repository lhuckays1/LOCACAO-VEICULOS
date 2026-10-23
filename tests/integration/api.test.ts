import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Server } from 'node:http';

// This suite only runs against an explicitly supplied disposable test database.
if (!process.env.TEST_DATABASE_URL || !/\/[^/?]*test[^/?]*(\?|$)/i.test(process.env.TEST_DATABASE_URL))
  throw new Error('TEST_DATABASE_URL deve apontar para um banco descartável com "test" no nome.');
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.DIRECT_URL = process.env.TEST_DATABASE_URL;
process.env.JWT_SECRET = randomBytes(48).toString('hex');
process.env.JWT_REFRESH_SECRET = randomBytes(48).toString('hex');
const { prisma } = await import('../../backend/src/config/prisma.js');
const { hashPassword } = await import('../../backend/src/config/jwt.js');
const { issueSession } = await import('../../backend/src/services/auth-session.js');
const { default: app } = await import('../../backend/src/app.js');
let server: Server, base: string;
const companies: string[] = [];
let a: Awaited<ReturnType<typeof fixture>>, b: Awaited<ReturnType<typeof fixture>>;
const password = 'Test@Password2026';

async function fixture() {
  const company = await prisma.company.create({ data: { name: 'TEST', legalName: 'TEST', document: randomUUID(), phone: '11999999999', email: 'test@example.com', address: 'TEST', city: 'TEST', state: 'SP', zipCode: '01000000' } });
  companies.push(company.id);
  const user = await prisma.user.create({ data: { companyId: company.id, name: 'TEST USER', email: `${randomUUID()}@example.com`, password: hashPassword(password), role: 'ADMIN' } });
  const client = await prisma.client.create({ data: { companyId: company.id, name: 'TEST CLIENT', cpfCnpj: randomUUID(), phone: '11999999999', email: 'client@example.com', zipCode: '01000000', street: 'TEST', number: '1', neighborhood: 'TEST', city: 'TEST', state: 'SP' } });
  const vehicle = await prisma.vehicle.create({ data: { companyId: company.id, plate: randomUUID().slice(0, 7), brand: 'TEST', model: 'TEST', manufactureYear: 2026, modelYear: 2026, color: 'WHITE', fuel: 'GASOLINA', category: 'TEST', currentMileage: 100, dailyRate: 100, weeklyRate: 500, monthlyRate: 2000 } });
  const tokens = await issueSession({ userId: user.id, companyId: company.id, role: user.role, email: user.email, name: user.name }, user.password, 60);
  return { company, user, vehicle, client, ...tokens };
}
async function api(path: string, token: string, method = 'GET', body?: unknown) {
  const res = await fetch(base + path, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as any).port}/api`;
  a = await fixture(); b = await fixture();
});
after(async () => {
  for (const id of companies) await prisma.company.delete({ where: { id } });
  await prisma.$disconnect();
  if (server) await new Promise<void>(resolve => server.close(() => resolve()));
});

test('financial create/list/details persist in PostgreSQL and isolate tenants', async () => {
  const created = await api('/financial/transactions', a.accessToken, 'POST', { type: 'INCOME', description: 'TEST RECEITA', grossAmount: 100, dueDate: '2026-01-10', vehicleId: a.vehicle.id });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const id = created.body.data.id;
  assert.ok(await prisma.financialTransaction.findUnique({ where: { id } }));
  const list = await api('/financial/transactions', a.accessToken);
  assert.ok(list.body.data.some((t: any) => t.id === id));
  assert.equal((await api(`/financial/transactions/${id}`, b.accessToken)).status, 404);
  assert.equal((await api('/financial/transactions', a.accessToken, 'POST', { type: 'INCOME', description: 'INVALID LINK', grossAmount: 100, dueDate: '2026-01-10', vehicleId: b.vehicle.id })).status, 400);
  assert.equal((await api(`/financial/transactions/${id}/settle`, a.accessToken, 'POST', { amount: 40, paymentDate: '2026-01-11', paymentMethod: 'PIX' })).status, 200);
  assert.equal((await prisma.financialTransaction.findUniqueOrThrow({ where: { id } })).remainingAmount.toNumber(), 60);
  assert.equal((await api(`/financial/transactions/${id}/cancel`, a.accessToken, 'POST', {})).status, 409);
  const payments = await Promise.all([1, 2].map(() => api(`/financial/transactions/${id}/settle`, a.accessToken, 'POST', { amount: 60, paymentDate: '2026-01-12', paymentMethod: 'PIX' })));
  assert.deepEqual(payments.map(r => r.status).sort(), [200, 409]);
  const record = await prisma.financialTransaction.findUniqueOrThrow({ where: { id } });
  assert.equal(record.paidAmount.toNumber(), 100);
  assert.equal(record.status, 'PAID');
  assert.equal(await prisma.financialSettlement.count({ where: { transactionId: id } }), 2);
});

test('maintenance create/details/items/update/complete share the same durable record', async () => {
  const created = await api('/maintenance', a.accessToken, 'POST', { vehicleId: a.vehicle.id, titulo: 'REVISÃO TESTE', descricao: 'REVISÃO COMPLETA', kmEntrada: 100, dataAgendamento: '2026-10-23' });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const id = created.body.data.id;
  assert.equal((await api(`/maintenance/${id}`, a.accessToken)).status, 200);
  assert.equal((await api(`/maintenance/${id}`, b.accessToken)).status, 404);
  assert.equal((await api(`/maintenance/${id}/services`, a.accessToken, 'POST', { descricao: 'TROCA ÓLEO', quantidade: 2, valorUnitario: 50 })).status, 201);
  assert.equal((await api(`/maintenance/${id}`, a.accessToken, 'PUT', { custoOutros: 25 })).status, 200);
  assert.equal((await prisma.maintenance.findUniqueOrThrow({ where: { id } })).custoTotal.toNumber(), 125);
  assert.equal((await api(`/maintenance/${id}/start`, a.accessToken, 'POST', {})).status, 200);
  assert.equal((await api(`/maintenance/${id}/complete`, a.accessToken, 'POST', { valorReal: 125, kmConclusao: 101 })).status, 200);
  const financial = await prisma.financialTransaction.findFirstOrThrow({ where: { maintenanceId: id } });
  assert.equal(financial.grossAmount.toNumber(), 125);
  assert.equal((await api(`/maintenance/${id}/parts`, a.accessToken, 'POST', { nome: 'EXTRA', quantidade: 1, valorUnitario: 10 })).status, 409);
});

test('maintenance catalogs persist and cannot be modified across companies', async () => {
  const created = await api('/maintenance/workshops', a.accessToken, 'POST', { nome: 'OFICINA TESTE', telefone: '11999999999' });
  assert.equal(created.status, 201);
  const id = created.body.data.id;
  assert.ok((await api('/maintenance/workshops/list', a.accessToken)).body.data.some((r: any) => r.id === id));
  assert.equal((await api(`/maintenance/workshops/${id}`, b.accessToken, 'PUT', { nome: 'INVALID UPDATE' })).status, 404);
});

test('concurrent maintenance creation produces distinct codes and cancelled orders remain durable', async () => {
  const requests = await Promise.all([1, 2].map(() => api('/maintenance', a.accessToken, 'POST', {
    vehicleId: a.vehicle.id, titulo: 'ORDEM CONCORRENTE', descricao: 'REVISÃO TESTE', kmEntrada: 101, dataAgendamento: '2026-10-24',
  })));
  assert.deepEqual(requests.map(r => r.status), [201, 201]);
  assert.notEqual(requests[0].body.data.codigo, requests[1].body.data.codigo);
  const id = requests[0].body.data.id;
  assert.equal((await api(`/maintenance/${id}/cancel`, a.accessToken, 'POST', {})).status, 200);
  assert.equal((await prisma.maintenance.findUniqueOrThrow({ where: { id } })).status, 'CANCELLED');
});

test('concurrent rentals cannot reserve the same vehicle and payments stay synchronized across endpoints', async () => {
  const payload = { clientId: a.client.id, vehicleId: a.vehicle.id, startDate: '2026-10-25', endDate: '2026-11-01',
    valorPeriodo: 100, quantidadePeriodos: 1, initialMileage: 101, status: 'ATIVA' };
  const results = await Promise.all([1, 2].map(() => api('/rentals', a.accessToken, 'POST', payload)));
  assert.equal(results.filter(r => r.status === 201).length, 1, JSON.stringify(results));
  assert.ok(results.some(r => r.status === 400 || r.status === 409));
  const rental = await prisma.rental.findFirstOrThrow({ where: { companyId: a.company.id } });
  const payment = await prisma.rentalPayment.findFirstOrThrow({ where: { rentalId: rental.id } });
  const financial = await prisma.financialTransaction.findFirstOrThrow({ where: { rentalPaymentId: payment.id } });
  assert.equal((await api(`/financial/transactions/${financial.id}/settle`, a.accessToken, 'POST', { amount: 20, paymentDate: payment.dataVencimento, paymentMethod: 'PIX' })).status, 200);
  assert.equal((await prisma.rentalPayment.findUniqueOrThrow({ where: { id: payment.id } })).status, 'PARCIAL');
  const paid = await api(`/rentals/${rental.id}/payments/${payment.id}/pay`, a.accessToken, 'POST', { formaPagamento: 'PIX', dataPagamento: payment.dataVencimento });
  assert.equal(paid.status, 200, JSON.stringify(paid.body));
  const updated = await prisma.financialTransaction.findUniqueOrThrow({ where: { id: financial.id } });
  assert.equal(Number(updated.paidAmount), Number(updated.netAmount));
  assert.equal(Number(updated.remainingAmount), 0);
  assert.equal((await prisma.rentalPayment.findUniqueOrThrow({ where: { id: payment.id } })).status, 'PAGO');
});

test('login, password changes and company suspension enforce current session state', async () => {
  const logged = await api('/auth/login', '', 'POST', { email: a.user.email, password });
  assert.equal(logged.status, 200);
  const changed = await api('/auth/change-password', logged.body.accessToken, 'POST', { currentPassword: password, newPassword: 'New@TestPassword2026' });
  assert.equal(changed.status, 200);
  assert.equal((await api('/auth/me', logged.body.accessToken)).status, 401);
  assert.equal((await api('/auth/me', changed.body.accessToken)).status, 200);
  await prisma.company.update({ where: { id: a.company.id }, data: { active: false } });
  assert.equal((await api('/financial/transactions', changed.body.accessToken)).status, 401);
  await prisma.company.update({ where: { id: a.company.id }, data: { active: true } });
  await prisma.user.update({ where: { id: a.user.id }, data: { role: 'OPERATOR' } });
  assert.equal((await api('/financial/transactions', changed.body.accessToken, 'POST', { type: 'INCOME', description: 'FORBIDDEN', grossAmount: 1, dueDate: '2026-10-23' })).status, 403);
});

test('refresh rotates tokens, logout revokes access, password and active flags invalidate sessions', async () => {
  let session = await issueSession({ userId: b.user.id, companyId: b.company.id, role: 'ADMIN', email: b.user.email, name: b.user.name }, b.user.password, 60);
  const refreshed = await api('/auth/refresh', '', 'POST', { refreshToken: session.refreshToken });
  assert.equal(refreshed.status, 200);
  assert.equal((await api('/auth/refresh', '', 'POST', { refreshToken: session.refreshToken })).status, 401);
  session = refreshed.body;
  assert.equal((await api('/auth/me', session.accessToken)).status, 200);
  await api('/auth/logout', session.accessToken, 'POST', { refreshToken: session.refreshToken });
  assert.equal((await api('/auth/me', session.accessToken)).status, 401);
  assert.equal((await api('/auth/refresh', '', 'POST', { refreshToken: session.refreshToken })).status, 401);
  await prisma.user.update({ where: { id: b.user.id }, data: { active: false } });
  assert.equal((await api('/financial/transactions', b.accessToken)).status, 401);
  await prisma.user.update({ where: { id: b.user.id }, data: { active: true, password: hashPassword('Changed@Password2026') } });
  assert.equal((await api('/financial/transactions', b.accessToken)).status, 401);
  assert.equal((await api('/auth/refresh', '', 'POST', { refreshToken: b.refreshToken })).status, 401);
});

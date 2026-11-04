import { NextFunction, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { maintenanceController } from './maintenance.persisted.controller.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const INSURANCE_NOTICE_DAYS = 30;

export class NotificationsController {
  async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const companyId = req.user!.companyId!;
      const userId = req.user!.userId;
      const [data, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where: { companyId, userId, resolvedAt: null },
          orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
          take: 50,
        }),
        prisma.notification.count({ where: { companyId, userId, resolvedAt: null, readAt: null } }),
      ]);
      res.json({ total: data.length, unreadCount, data });
    } catch (err) { next(err); }
  }

  async markRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await prisma.notification.updateMany({
        where: { id: req.params.id, companyId: req.user!.companyId!, userId: req.user!.userId, resolvedAt: null },
        data: { readAt: new Date() },
      });
      if (!result.count) { res.status(404).json({ message: 'Notificação não encontrada.' }); return; }
      res.json({ message: 'Notificação marcada como lida.' });
    } catch (err) { next(err); }
  }

  async markAllRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      await prisma.notification.updateMany({
        where: { companyId: req.user!.companyId!, userId: req.user!.userId, resolvedAt: null, readAt: null },
        data: { readAt: new Date() },
      });
      res.json({ message: 'Notificações marcadas como lidas.' });
    } catch (err) { next(err); }
  }

  async runDaily(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
      res.status(401).json({ message: 'Não autorizado.' });
      return;
    }

    try {
      const companies = await prisma.company.findMany({
        where: { active: true, status: 'ACTIVE' },
        select: { id: true },
      });
      let generated = 0;

      for (const company of companies) {
        const users = await prisma.user.findMany({
          where: { companyId: company.id, active: true, role: { in: ['ADMIN', 'MANAGER', 'FINANCIAL'] } },
          select: { id: true },
        });
        const activeIds: string[] = [];
        const publish = async (notice: {
          type: string; severity: number; title: string; message: string;
          entityId: string; actionTab: string; eventKey: string;
        }) => {
          for (const user of users) {
            const saved = await prisma.notification.upsert({
              where: { userId_eventKey: { userId: user.id, eventKey: notice.eventKey } },
              create: { companyId: company.id, userId: user.id, ...notice },
              update: { ...notice, resolvedAt: null },
              select: { id: true },
            });
            activeIds.push(saved.id);
            generated++;
          }
        };

        const maintenanceAlerts = await maintenanceController.calculateAlerts(company.id);
        for (const alert of maintenanceAlerts) {
          if (alert.severity < 1) continue;
          const level = alert.severity >= 3 ? 'vencida' : alert.severity === 2 ? 'próxima' : 'em atenção';
          const eventKey = `MANUTENCAO:${alert.id}:${alert.proximaKm ?? ''}:${alert.proximaData ?? ''}`;
          const remaining = alert.kmRestante !== null
            ? `Faltam ${Math.max(0, alert.kmRestante).toLocaleString('pt-BR')} km.`
            : alert.diasRestantes !== null
              ? `Prazo: ${alert.diasRestantes < 0 ? `${Math.abs(alert.diasRestantes)} dia(s) vencido` : `em ${alert.diasRestantes} dia(s)`}.`
              : 'A revisão está no período de alerta.';
          await publish({
            type: 'MANUTENCAO', severity: alert.severity,
            title: `Revisão ${level} — ${alert.vehiclePlate}`,
            message: `${alert.serviceName}: ${remaining}`,
            entityId: alert.vehicleId, actionTab: 'MANUTENCAO', eventKey,
          });
        }

        const now = new Date();
        const cutoff = new Date(now.getTime() + INSURANCE_NOTICE_DAYS * DAY_MS);
        const policies = await prisma.vehicleInsurance.findMany({
          where: { companyId: company.id, status: 'ACTIVE', endDate: { lte: cutoff } },
          include: { vehicle: { select: { plate: true } } },
        });
        const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        for (const policy of policies) {
          const end = new Date(policy.endDate);
          const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
          const daysRemaining = Math.ceil((endDay - today) / DAY_MS);
          const severity = daysRemaining < 0 ? 3 : daysRemaining <= 7 ? 2 : 1;
          await publish({
            type: 'SEGURO', severity,
            title: daysRemaining < 0 ? `Seguro vencido — ${policy.vehicle.plate}` : `Seguro próximo do vencimento — ${policy.vehicle.plate}`,
            message: daysRemaining < 0
              ? `A apólice ${policy.policyNumber} venceu há ${Math.abs(daysRemaining)} dia(s).`
              : `A apólice ${policy.policyNumber} vence em ${daysRemaining} dia(s).`,
            entityId: policy.id, actionTab: 'FINANCEIRO',
            eventKey: `SEGURO:${policy.id}:${end.toISOString().slice(0, 10)}`,
          });
        }

        await prisma.notification.updateMany({
          where: {
            companyId: company.id,
            resolvedAt: null,
            ...(activeIds.length ? { id: { notIn: activeIds } } : {}),
          },
          data: { resolvedAt: new Date() },
        });
      }

      res.json({ message: 'Verificação diária concluída.', companies: companies.length, notificationsProcessed: generated });
    } catch (err) { next(err); }
  }
}

export const notificationsController = new NotificationsController();

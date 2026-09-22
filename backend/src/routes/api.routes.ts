import { Router } from 'express';

import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import companyRoutes from './company.routes.js';

import clientsRoutes from './clients.routes.js';
import vehiclesRoutes from './vehicles.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import rentalsRoutes from './rentals.routes.js';
import financialRoutes from './financial.routes.js';
import maintenanceRoutes from './maintenance.routes.js';
import inspectionsRoutes from './inspections.routes.js';
import userRoutes from './user.routes.js';

const apiRouter = Router();

/**
 * AUTENTICAÇÃO
 */
apiRouter.use('/auth', authRoutes);

/**
 * ADMINISTRAÇÃO GLOBAL
 */
apiRouter.use('/admin', adminRoutes);

/**
 * EMPRESAS
 *
 * Exclusivo SUPER_ADMIN
 */
apiRouter.use('/companies', companyRoutes);

/**
 * MÓDULOS OPERACIONAIS
 */
apiRouter.use('/clients', clientsRoutes);
apiRouter.use('/vehicles', vehiclesRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/rentals', rentalsRoutes);
apiRouter.use('/financial', financialRoutes);
apiRouter.use('/maintenance', maintenanceRoutes);
apiRouter.use('/inspections', inspectionsRoutes);
apiRouter.use('/users', userRoutes);

/**
 * HEALTH CHECK
 */
apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'online',
    app: 'FROTA CRM API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default apiRouter;
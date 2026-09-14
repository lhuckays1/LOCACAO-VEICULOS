import { Router } from 'express';

import {
  authMiddleware,
  superAdminMiddleware,
} from '../middlewares/auth.middleware.js';

import {
  companyController,
} from '../controllers/company.controller.js';

const router = Router();

/**
 * Todas as rotas deste módulo são protegidas.
 *
 * Somente SUPER_ADMIN pode administrar empresas.
 */
router.use(authMiddleware);
router.use(superAdminMiddleware);

/**
 * GET
 * /api/companies/summary
 */
router.get(
  '/summary',
  companyController.summary
);

/**
 * GET
 * /api/companies
 */
router.get(
  '/',
  companyController.list
);

/**
 * GET
 * /api/companies/:id
 */
router.get(
  '/:id',
  companyController.getById
);

/**
 * POST
 * /api/companies
 */
router.post(
  '/',
  companyController.create
);

/**
 * PUT
 * /api/companies/:id
 */
router.put(
  '/:id',
  companyController.update
);

/**
 * PATCH
 * /api/companies/:id/toggle-status
 */
router.patch(
  '/:id/toggle-status',
  companyController.toggleStatus
);

export default router;
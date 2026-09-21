import { Router } from 'express';
import { rentalsController } from '../controllers/rentals.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { uppercaseMiddleware } from '../middlewares/uppercase.middleware.js';

const router = Router();

router.use(authMiddleware);

// List rentals with filters
router.get('/', (req, res, next) => rentalsController.list(req, res, next));

// Get rental details with tabs data
router.get('/:id', (req, res, next) => rentalsController.getById(req, res, next));

// Create new rental (Wizard)
router.post(
  '/',
  authorize(['ADMIN', 'MANAGER', 'OPERATOR']),
  uppercaseMiddleware,
  (req, res, next) => rentalsController.create(req, res, next)
);

// Delete rental permanently (only ADMIN/MANAGER)
router.delete(
  '/:id',
  authorize(['ADMIN', 'MANAGER']),
  (req, res, next) => rentalsController.delete(req, res, next)
);

// Cancel rental (only RASCUNHO or AGENDADA)
router.post(
  '/:id/cancel',
  authorize(['ADMIN', 'MANAGER']),
  uppercaseMiddleware,
  (req, res, next) => rentalsController.cancel(req, res, next)
);

// Update status / Devolução do veículo
router.patch(
  '/:id/status',
  authorize(['ADMIN', 'MANAGER', 'OPERATOR']),
  uppercaseMiddleware,
  (req, res, next) => rentalsController.updateStatus(req, res, next)
);

// Pay installment
router.post(
  '/:id/payments/:paymentId/pay',
  authorize(['ADMIN', 'MANAGER', 'FINANCIAL']),
  uppercaseMiddleware,
  (req, res, next) => rentalsController.payPayment(req, res, next)
);

// Update deposit / caução
router.patch(
  '/:id/caucao',
  authorize(['ADMIN', 'MANAGER', 'FINANCIAL']),
  uppercaseMiddleware,
  (req, res, next) => rentalsController.updateCaucao(req, res, next)
);

export default router;

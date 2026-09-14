import { Router } from 'express';
import { clientsController } from '../controllers/clients.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { uppercaseMiddleware } from '../middlewares/uppercase.middleware.js';

const router = Router();

// Require authenticated user for all client routes
router.use(authMiddleware);

router.get('/', (req, res, next) => clientsController.list(req, res, next));
router.get('/:id', (req, res, next) => clientsController.getById(req, res, next));

// Create, Update, Delete restricted to ADMIN, MANAGER, OPERATOR
router.post(
  '/',
  authorize(['ADMIN', 'MANAGER', 'OPERATOR']),
  uppercaseMiddleware,
  (req, res, next) => clientsController.create(req, res, next)
);

router.put(
  '/:id',
  authorize(['ADMIN', 'MANAGER', 'OPERATOR']),
  uppercaseMiddleware,
  (req, res, next) => clientsController.update(req, res, next)
);

router.delete(
  '/:id',
  authorize(['ADMIN', 'MANAGER']),
  (req, res, next) => clientsController.delete(req, res, next)
);

export default router;

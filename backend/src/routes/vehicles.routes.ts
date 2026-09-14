import { Router } from 'express';
import { vehiclesController } from '../controllers/vehicles.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { uppercaseMiddleware } from '../middlewares/uppercase.middleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', (req, res, next) => vehiclesController.list(req, res, next));
router.get('/:id', (req, res, next) => vehiclesController.getById(req, res, next));

router.post(
  '/',
  authorize(['ADMIN', 'MANAGER', 'OPERATOR']),
  uppercaseMiddleware,
  (req, res, next) => vehiclesController.create(req, res, next)
);

router.put(
  '/:id',
  authorize(['ADMIN', 'MANAGER', 'OPERATOR']),
  uppercaseMiddleware,
  (req, res, next) => vehiclesController.update(req, res, next)
);

router.delete(
  '/:id',
  authorize(['ADMIN', 'MANAGER']),
  (req, res, next) => vehiclesController.delete(req, res, next)
);

export default router;

import { Router } from 'express';
import { inspectionsController } from '../controllers/inspections.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req, res, next) => inspectionsController.list(req, res, next));
router.get('/:id', (req, res, next) => inspectionsController.getById(req, res, next));
router.post('/', authorize(['ADMIN', 'MANAGER', 'OPERATOR']), (req, res, next) => inspectionsController.create(req, res, next));
router.delete('/:id', authorize(['ADMIN', 'MANAGER']), (req, res, next) => inspectionsController.delete(req, res, next));

export default router;

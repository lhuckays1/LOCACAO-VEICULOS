import { Router } from 'express';
import { notificationsController } from '../controllers/notifications.controller.js';
import { authMiddleware, requireCompany } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(authMiddleware, requireCompany);
router.get('/', (req, res, next) => notificationsController.list(req, res, next));
router.patch('/read-all', (req, res, next) => notificationsController.markAllRead(req, res, next));
router.patch('/:id/read', (req, res, next) => notificationsController.markRead(req, res, next));
export default router;

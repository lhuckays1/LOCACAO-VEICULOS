import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { authMiddleware, requireCompany } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authMiddleware, requireCompany);

router.get('/', (req, res, next) => dashboardController.getMetrics(req, res, next));

export default router;

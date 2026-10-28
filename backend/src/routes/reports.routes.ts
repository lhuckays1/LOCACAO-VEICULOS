import { Router } from 'express';
import { reportsController } from '../controllers/fleet-records.controller.js';
import { authMiddleware, requireCompany } from '../middlewares/auth.middleware.js';
const router = Router();
router.use(authMiddleware, requireCompany);
router.get('/', (req, res, next) => reportsController.get(req, res, next));
export default router;

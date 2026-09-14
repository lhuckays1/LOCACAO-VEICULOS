import { Router } from 'express';
import { financialController } from '../controllers/financial.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { uppercaseMiddleware } from '../middlewares/uppercase.middleware.js';

const router = Router();

// Enforce authentication for all financial endpoints
router.use(authMiddleware);

// Dashboard & KPIs
router.get('/dashboard', (req, res, next) => financialController.getDashboard(req, res, next));

// Transactions search & filters
router.get('/transactions', (req, res, next) => financialController.listTransactions(req, res, next));
router.get('/transactions/:id', (req, res, next) => financialController.getTransactionById(req, res, next));

// Specialized views
router.get('/receivables', (req, res, next) => financialController.getReceivables(req, res, next));
router.get('/payables', (req, res, next) => financialController.getPayables(req, res, next));
router.get('/cashflow', (req, res, next) => financialController.getCashFlow(req, res, next));
router.get('/overdue', (req, res, next) => financialController.getOverdue(req, res, next));
router.get('/vehicle/:id', (req, res, next) => financialController.getVehicleStatement(req, res, next));

// Transaction write operations (RBAC: ADMIN, MANAGER, FINANCIAL)
router.post(
  '/transactions',
  authorize(['ADMIN', 'MANAGER', 'FINANCIAL']),
  uppercaseMiddleware,
  (req, res, next) => financialController.createTransaction(req, res, next)
);

router.post(
  '/transactions/:id/settle',
  authorize(['ADMIN', 'MANAGER', 'FINANCIAL']),
  uppercaseMiddleware,
  (req, res, next) => financialController.settleTransaction(req, res, next)
);

router.post(
  '/transactions/:id/cancel',
  authorize(['ADMIN', 'MANAGER', 'FINANCIAL']),
  uppercaseMiddleware,
  (req, res, next) => financialController.cancelTransaction(req, res, next)
);

// Categories
router.get('/categories', (req, res, next) => financialController.listCategories(req, res, next));
router.post(
  '/categories',
  authorize(['ADMIN', 'MANAGER', 'FINANCIAL']),
  uppercaseMiddleware,
  (req, res, next) => financialController.createCategory(req, res, next)
);
router.delete(
  '/categories/:id',
  authorize(['ADMIN', 'MANAGER']),
  (req, res, next) => financialController.deleteCategory(req, res, next)
);

// Cost Centers
router.get('/cost-centers', (req, res, next) => financialController.listCostCenters(req, res, next));
router.post(
  '/cost-centers',
  authorize(['ADMIN', 'MANAGER', 'FINANCIAL']),
  uppercaseMiddleware,
  (req, res, next) => financialController.createCostCenter(req, res, next)
);
router.delete(
  '/cost-centers/:id',
  authorize(['ADMIN', 'MANAGER']),
  (req, res, next) => financialController.deleteCostCenter(req, res, next)
);

export default router;

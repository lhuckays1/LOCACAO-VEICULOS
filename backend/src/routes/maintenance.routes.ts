import { Router } from 'express';
import { maintenanceController } from '../controllers/maintenance.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { uppercaseMiddleware } from '../middlewares/uppercase.middleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/dashboard', (req, res, next) => maintenanceController.dashboard(req, res, next));
router.get('/alerts', (req, res, next) => maintenanceController.alerts(req, res, next));
router.get('/', (req, res, next) => maintenanceController.list(req, res, next));
router.get('/:id', (req, res, next) => maintenanceController.getById(req, res, next));

router.post('/', authorize(['ADMIN', 'MANAGER', 'OPERATOR']), uppercaseMiddleware,
  (req, res, next) => maintenanceController.create(req, res, next));
router.put('/:id', authorize(['ADMIN', 'MANAGER', 'OPERATOR']), uppercaseMiddleware,
  (req, res, next) => maintenanceController.update(req, res, next));
router.post('/:id/start', authorize(['ADMIN', 'MANAGER', 'OPERATOR']),
  (req, res, next) => maintenanceController.start(req, res, next));
router.post('/:id/complete', authorize(['ADMIN', 'MANAGER', 'OPERATOR']), uppercaseMiddleware,
  (req, res, next) => maintenanceController.complete(req, res, next));
router.post('/:id/cancel', authorize(['ADMIN', 'MANAGER']),
  (req, res, next) => maintenanceController.cancel(req, res, next));

router.post('/:id/services', authorize(['ADMIN', 'MANAGER', 'OPERATOR']), uppercaseMiddleware,
  (req, res, next) => maintenanceController.addService(req, res, next));
router.delete('/:id/services/:serviceId', authorize(['ADMIN', 'MANAGER', 'OPERATOR']),
  (req, res, next) => maintenanceController.removeService(req, res, next));
router.post('/:id/parts', authorize(['ADMIN', 'MANAGER', 'OPERATOR']), uppercaseMiddleware,
  (req, res, next) => maintenanceController.addPart(req, res, next));
router.delete('/:id/parts/:partId', authorize(['ADMIN', 'MANAGER', 'OPERATOR']),
  (req, res, next) => maintenanceController.removePart(req, res, next));

router.get('/plans/list', (req, res, next) => maintenanceController.listPlans(req, res, next));
router.post('/plans', authorize(['ADMIN', 'MANAGER', 'OPERATOR']), uppercaseMiddleware,
  (req, res, next) => maintenanceController.createPlan(req, res, next));
router.put('/plans/:id', authorize(['ADMIN', 'MANAGER', 'OPERATOR']), uppercaseMiddleware,
  (req, res, next) => maintenanceController.updatePlan(req, res, next));
router.delete('/plans/:id', authorize(['ADMIN', 'MANAGER']),
  (req, res, next) => maintenanceController.deletePlan(req, res, next));

router.get('/workshops/list', (req, res, next) => maintenanceController.listWorkshops(req, res, next));
router.post('/workshops', authorize(['ADMIN', 'MANAGER', 'OPERATOR']), uppercaseMiddleware,
  (req, res, next) => maintenanceController.createWorkshop(req, res, next));
router.put('/workshops/:id', authorize(['ADMIN', 'MANAGER', 'OPERATOR']), uppercaseMiddleware,
  (req, res, next) => maintenanceController.updateWorkshop(req, res, next));
router.delete('/workshops/:id', authorize(['ADMIN', 'MANAGER']),
  (req, res, next) => maintenanceController.deleteWorkshop(req, res, next));

router.get('/suppliers/list', (req, res, next) => maintenanceController.listSuppliers(req, res, next));
router.post('/suppliers', authorize(['ADMIN', 'MANAGER', 'OPERATOR']), uppercaseMiddleware,
  (req, res, next) => maintenanceController.createSupplier(req, res, next));
router.put('/suppliers/:id', authorize(['ADMIN', 'MANAGER', 'OPERATOR']), uppercaseMiddleware,
  (req, res, next) => maintenanceController.updateSupplier(req, res, next));
router.delete('/suppliers/:id', authorize(['ADMIN', 'MANAGER']),
  (req, res, next) => maintenanceController.deleteSupplier(req, res, next));

export default router;

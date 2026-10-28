import { Router } from 'express';
import { fleetRecordsController } from '../controllers/fleet-records.controller.js';
import { authMiddleware, requireCompany } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';

const router = Router();
router.use(authMiddleware, requireCompany);
const editors = authorize(['ADMIN', 'MANAGER', 'OPERATOR']);
const managers = authorize(['ADMIN', 'MANAGER']);
router.get('/fines', (req, res, next) => fleetRecordsController.listFines(req, res, next));
router.post('/fines', editors, (req, res, next) => fleetRecordsController.saveFine(req, res, next));
router.put('/fines/:id', editors, (req, res, next) => fleetRecordsController.saveFine(req, res, next));
router.delete('/fines/:id', managers, (req, res, next) => fleetRecordsController.deleteFine(req, res, next));
router.get('/incidents', (req, res, next) => fleetRecordsController.listIncidents(req, res, next));
router.post('/incidents', editors, (req, res, next) => fleetRecordsController.saveIncident(req, res, next));
router.put('/incidents/:id', editors, (req, res, next) => fleetRecordsController.saveIncident(req, res, next));
router.delete('/incidents/:id', managers, (req, res, next) => fleetRecordsController.deleteIncident(req, res, next));
export default router;

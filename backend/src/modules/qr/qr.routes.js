import { Router } from 'express';
import * as controller from './qr.controller.js';
import { optionalAuth } from '../../middlewares/auth.middleware.js';

const router = Router();

router.post('/generate', optionalAuth, controller.generate);
router.get('/', optionalAuth, controller.list);
router.get('/ref/:ref', controller.resolve);  // Public endpoint to get QR by ref
router.post('/:ref/scan', controller.scan);
router.delete('/:id', optionalAuth, controller.remove);

export default router;

import { Router } from 'express';
import * as controller from './paymentlink.controller.js';
import { optionalAuth } from '../../middlewares/auth.middleware.js';

const router = Router();

router.post('/', optionalAuth, controller.create);
router.get('/', optionalAuth, controller.list);
router.get('/slug/:slug', controller.resolve);
router.post('/slug/:slug/use', controller.recordUse);
router.patch('/:id/deactivate', optionalAuth, controller.deactivate);
router.delete('/:id', optionalAuth, controller.remove);

export default router;

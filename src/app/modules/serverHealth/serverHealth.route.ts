import express from 'express';
import { ServerHealthControllers } from './serverHealth.controller';
import { ROLE_GROUPS } from '../../../enums/user';
import auth from '../../middlewares/auth';

const router = express.Router();

router.get('/', auth(...ROLE_GROUPS.ADMINS), ServerHealthControllers.serverHealth);
router.get('/server-logs', auth(...ROLE_GROUPS.ADMINS), ServerHealthControllers.getServerLogs);
router.get('/queue-and-cache', auth(...ROLE_GROUPS.ADMINS), ServerHealthControllers.getQueueAndCacheStatus);
router.post('/queue-action', auth(...ROLE_GROUPS.ADMINS), ServerHealthControllers.executeQueueAction);
router.post('/flush-cache', auth(...ROLE_GROUPS.ADMINS), ServerHealthControllers.flushCache);

export const ServerHealthRoutes = router;

import express from 'express';
import { ServerHealthControllers } from './serverHealth.controller';
import { ROLE_GROUPS } from '../../../enums/user';
import auth from '../../middlewares/auth';

const router = express.Router();

router.get('/', auth(...ROLE_GROUPS.ADMINS), ServerHealthControllers.serverHealth);
export const ServerHealthRoutes = router;

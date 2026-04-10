import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { ReportController } from './report.controller';
const router = express.Router();


router.post('/', 
    auth(USER_ROLES.BARBER),
    ReportController.createReport
);

export const ReportRoutes = router;
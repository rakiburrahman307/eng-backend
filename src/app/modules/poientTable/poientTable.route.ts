import express from 'express';
import { PointTableController } from './poientTable.controlle';


const router = express.Router();

// GET POINT TABLE
router.route('/').get(PointTableController.getPointTable);


export default router;

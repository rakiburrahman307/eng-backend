import express from 'express';
import auth from '../../middlewares/auth';
import { USER_ROLES } from '../../../enums/user';
import { CoinAndBudgetController } from './coinAndBudget.controller';

const router = express.Router();

// ==========================================
// Player Economy Routes
// ==========================================

router
  .route('/player-economy')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    CoinAndBudgetController.savePlayerEconomy
  )
  .get(CoinAndBudgetController.getPlayerEconomy)
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    CoinAndBudgetController.deletePlayerEconomy
  );

// ==========================================
// Club Economy Routes
// ==========================================

router
  .route('/club-economy')
  .post(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    CoinAndBudgetController.saveClubEconomy
  )
  .get(CoinAndBudgetController.getClubEconomy)
  .delete(
    auth(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
    CoinAndBudgetController.deleteClubEconomy
  );

export default router;

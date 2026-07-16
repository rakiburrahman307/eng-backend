import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import { IPlayerEconomy, IClubEconomy } from './economy.interface';
import { PlayerEconomy } from './playerEconomySchema.model';
import { ClubEconomy } from './clubEconomySchema.model';

// ==========================================
// Player Economy Services
// ==========================================

const savePlayerEconomyToDB = async (payload: IPlayerEconomy) => {
  const isExist = await PlayerEconomy.findOne();
  if (isExist) {
    return await PlayerEconomy.findOneAndUpdate({}, payload, {
      new: true,
      runValidators: true,
    });
  }
  return await PlayerEconomy.create(payload);
};

const getPlayerEconomyFromDB = async () => {
  const result = await PlayerEconomy.findOne();
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Player Economy configuration not found');
  }
  return result;
};

const deletePlayerEconomyFromDB = async () => {
  const result = await PlayerEconomy.findOneAndDelete();
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Player Economy configuration not found');
  }
  return result;
};

// ==========================================
// Club Economy Services
// ==========================================

const saveClubEconomyToDB = async (payload: IClubEconomy) => {
  const isExist = await ClubEconomy.findOne();
  if (isExist) {
    return await ClubEconomy.findOneAndUpdate({}, payload, {
      new: true,
      runValidators: true,
    });
  }
  return await ClubEconomy.create(payload);
};

const getClubEconomyFromDB = async () => {
  const result = await ClubEconomy.findOne();
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Club Economy configuration not found');
  }
  return result;
};

const deleteClubEconomyFromDB = async () => {
  const result = await ClubEconomy.findOneAndDelete();
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Club Economy configuration not found');
  }
  return result;
};

export const CoinAndBudgetService = {
  savePlayerEconomyToDB,
  getPlayerEconomyFromDB,
  deletePlayerEconomyFromDB,
  saveClubEconomyToDB,
  getClubEconomyFromDB,
  deleteClubEconomyFromDB,
};

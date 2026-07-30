import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import QueryBuilder from '../../../util/queryBuilder';
import { ITournament } from './tournament.interface';
import { Tournament } from './tournament.model';

const createTournamentToDB = async (
  payload: Partial<ITournament>,
  userId?: string
): Promise<ITournament> => {
  if (!payload.title || !payload.description || !payload.startDate || !payload.endDate) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Title, description, startDate, and endDate are required'
    );
  }

  const start = new Date(payload.startDate);
  const end = new Date(payload.endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid startDate or endDate');
  }

  if (start >= end) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'startDate must be before endDate');
  }

  const result = await Tournament.create({
    ...payload,
    startDate: start,
    endDate: end,
    createdBy: userId,
  });

  return result;
};

const getAllTournamentsFromDB = async (query: Record<string, any>) => {
  const tournamentQuery = new QueryBuilder(Tournament.find(), query)
    .search(['title', 'description'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await tournamentQuery.modelQuery;
  const meta = await tournamentQuery.getPaginationInfo();

  return {
    meta,
    result,
  };
};

const getSingleTournamentFromDB = async (id: string): Promise<ITournament | null> => {
  const result = await Tournament.findById(id);
  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Tournament not found');
  }
  return result;
};

const updateTournamentInDB = async (
  id: string,
  payload: Partial<ITournament>
): Promise<ITournament | null> => {
  const isExist = await Tournament.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Tournament not found');
  }

  if (payload.startDate && payload.endDate) {
    const start = new Date(payload.startDate);
    const end = new Date(payload.endDate);
    if (start >= end) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'startDate must be before endDate');
    }
  }

  const result = await Tournament.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

const deleteTournamentFromDB = async (id: string): Promise<ITournament | null> => {
  const isExist = await Tournament.findById(id);
  if (!isExist) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Tournament not found');
  }

  const result = await Tournament.findByIdAndDelete(id);
  return result;
};

export const TournamentService = {
  createTournamentToDB,
  getAllTournamentsFromDB,
  getSingleTournamentFromDB,
  updateTournamentInDB,
  deleteTournamentFromDB,
};

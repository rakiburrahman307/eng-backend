import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import QueryBuilder from '../../../util/queryBilter';
import { ILeague } from './league.interface';
import { League } from './league.model';
import { getLeagueStatus } from './getLeagueStatus';

// CREATE
const createLeagueToDB = async (
  payload: ILeague,
  userId: string
) => {
  const result = await League.create({
    ...payload,
    createdBy: userId,
  });

  return result;
};

// GET ALL
const getAllLeaguesFromDB = async (query: Record<string, any>) => {
  const leagueQuery = new QueryBuilder(
    League.find(),
    query
  )
    .search(['leagueName', 'season'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await leagueQuery.modelQuery;
  const meta = await leagueQuery.getPaginationInfo();

  const updatedResult = result.map((league: any) => {
    const obj = league.toObject ? league.toObject() : league;

    return {
      ...obj,
      status: getLeagueStatus(obj.startDate, obj.endDate),
    };
  });

  return {
    meta,
    result: updatedResult,
  };
};

// GET SINGLE
const getSingleLeagueFromDB = async (id: string) => {
  const result = await League.findById(id);

  if (!result) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'League not found'
    );
  }

  const obj = result.toObject ? result.toObject() : result;

  return {
    ...obj,
    status: getLeagueStatus(obj.startDate, obj.endDate),
  };
};

// UPDATE
const updateLeagueToDB = async (
  id: string,
  payload: Partial<ILeague>
) => {
  const league = await League.findById(id);

  if (!league) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'League not found'
    );
  }

  const result = await League.findByIdAndUpdate(
    id,
    payload,
    {
      new: true,
    }
  );

  return result;
};

// DELETE
const deleteLeagueFromDB = async (id: string) => {
  const league = await League.findById(id);

  if (!league) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'League not found'
    );
  }

  return await League.findByIdAndDelete(id);
};

export const LeagueService = {
  createLeagueToDB,
  getAllLeaguesFromDB,
  getSingleLeagueFromDB,
  updateLeagueToDB,
  deleteLeagueFromDB,
};
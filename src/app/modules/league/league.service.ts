import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiErrors';
import QueryBuilder from "../../../util/queryBuilder";
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
  const { status, ageGroup, ...restQuery } = query;
  const now = new Date();

  const filterConditions: Record<string, any> = {};
  if (status === 'running') {
    filterConditions.startDate = { $lte: now };
    filterConditions.endDate = { $gte: now };
  } else if (status === 'upcoming') {
    filterConditions.startDate = { $gt: now };
  } else if (status === 'finished') {
    filterConditions.endDate = { $lt: now };
  }

  if (
    ageGroup &&
    ageGroup !== 'ALL' &&
    ageGroup !== 'all' &&
    ageGroup !== 'null' &&
    ageGroup !== 'undefined'
  ) {
    const trimmedAge = (ageGroup as string).trim();
    const exactRegex = new RegExp(`^${trimmedAge}$`, 'i');
    const wordRegex = new RegExp(`\\b${trimmedAge}\\b`, 'i');
    const numMatch = trimmedAge.match(/\d+/);
    const numPart = numMatch ? numMatch[0] : '';
    const underRegex = numPart
      ? new RegExp(`(u|under\\s*)${numPart}\\b`, 'i')
      : wordRegex;

    filterConditions.$or = [
      { ageGroup: exactRegex },
      { ageGroup: wordRegex },
      { ageGroup: underRegex },
    ];
  }

  const leagueQuery = new QueryBuilder(
    League.find(filterConditions),
    restQuery
  )
    .search(['leagueName', 'season', 'ageGroup'])
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

const getUniqueSeasonsFromDB = async () => {
  return await League.distinct('season');
};

const getUniqueAgeGroupsFromDB = async () => {
  const groups = await League.distinct('ageGroup');
  return groups.filter((g) => g && typeof g === 'string' && g.trim().length > 0);
};

const getLeagueAnalyticsFromDB = async (query: Record<string, any> = {}) => {
  const { ageGroup } = query;
  const now = new Date();

  const baseFilter: Record<string, any> = {};
  if (
    ageGroup &&
    ageGroup !== 'ALL' &&
    ageGroup !== 'all' &&
    ageGroup !== 'null' &&
    ageGroup !== 'undefined'
  ) {
    const trimmedAge = (ageGroup as string).trim();
    const exactRegex = new RegExp(`^${trimmedAge}$`, 'i');
    const wordRegex = new RegExp(`\\b${trimmedAge}\\b`, 'i');
    const numMatch = trimmedAge.match(/\d+/);
    const numPart = numMatch ? numMatch[0] : '';
    const underRegex = numPart
      ? new RegExp(`(u|under\\s*)${numPart}\\b`, 'i')
      : wordRegex;

    baseFilter.$or = [
      { ageGroup: exactRegex },
      { ageGroup: wordRegex },
      { ageGroup: underRegex },
    ];
  }

  const [total, running, upcoming, finished] = await Promise.all([
    League.countDocuments(baseFilter),
    League.countDocuments({
      ...baseFilter,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }),
    League.countDocuments({
      ...baseFilter,
      startDate: { $gt: now },
    }),
    League.countDocuments({
      ...baseFilter,
      endDate: { $lt: now },
    }),
  ]);

  return {
    total,
    running,
    upcoming,
    finished,
  };
};

export const LeagueService = {
  createLeagueToDB,
  getAllLeaguesFromDB,
  getSingleLeagueFromDB,
  updateLeagueToDB,
  deleteLeagueFromDB,
  getUniqueSeasonsFromDB,
  getUniqueAgeGroupsFromDB,
  getLeagueAnalyticsFromDB,
};
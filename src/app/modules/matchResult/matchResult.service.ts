import QueryBuilder from '../../../util/queryBilter';
import { MatchResult } from './matchResult.model';

// CREATE
const createMatchResultToDB = async (payload: any) => {
  return await MatchResult.create(payload);
};

// GET ALL
const getAllMatchResultsFromDB = async (query: Record<string, any>) => {
  const matchQuery = new QueryBuilder(MatchResult.find(), query)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await matchQuery.modelQuery
    .populate('match')
    .populate('team')
    .populate('player')
    .populate('addedBy');

  const meta = await matchQuery.getPaginationInfo();

  return {
    meta,
    result,
  };
};

// SINGLE
const getSingleMatchResultFromDB = async (id: string) => {
  const result = await MatchResult.findById(id)
    .populate('match')
    .populate('team')
    .populate('player')
    .populate('addedBy');

  if (!result) {
    throw new Error('Match event not found');
  }

  return result;
};

// UPDATE
const updateMatchResultToDB = async (id: string, payload: any) => {
  const result = await MatchResult.findById(id);

  if (!result) {
    throw new Error('Match event not found');
  }

  return await MatchResult.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

// DELETE
const deleteMatchResultFromDB = async (id: string) => {
  const result = await MatchResult.findById(id);

  if (!result) {
    throw new Error('Match event not found');
  }

  return await MatchResult.findByIdAndDelete(id);
};

// MATCH WISE
const getMatchWiseResultsFromDB = async (matchId: string) => {
  return await MatchResult.find({ match: matchId })
    .populate('team')
    .populate('player')
    .populate('addedBy')
    .sort({ minute: 1 });
};

export const MatchResultService = {
  createMatchResultToDB,
  getAllMatchResultsFromDB,
  getSingleMatchResultFromDB,
  updateMatchResultToDB,
  deleteMatchResultFromDB,
  getMatchWiseResultsFromDB,
};
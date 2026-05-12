import QueryBuilder from '../../../util/queryBilter';
import { Match } from './match.model';

// CREATE
const createMatchToDB = async (payload: any) => {
  if (payload.homeTeam === payload.awayTeam) {
    throw new Error('Same team cannot play match');
  }

  return await Match.create(payload);
};

// GET ALL
const getAllMatchesFromDB = async (query: Record<string, any>) => {
  const matchQuery = new QueryBuilder(Match.find(), query)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await matchQuery.modelQuery
    .populate('homeTeam')
    .populate('awayTeam')
    .populate('referee')
    .populate('winnerTeam');

  const meta = await matchQuery.getPaginationInfo();

  return {
    meta,
    result,
  };
};

// SINGLE
const getSingleMatchFromDB = async (id: string) => {
  const match = await Match.findById(id)
    .populate('homeTeam')
    .populate('awayTeam')
    .populate('referee')
    .populate('winnerTeam');

  if (!match) {
    throw new Error('Match not found');
  }

  return match;
};

// UPDATE
const updateMatchToDB = async (id: string, payload: any) => {
  const match = await Match.findById(id);

  if (!match) {
    throw new Error('Match not found');
  }

  if (
    payload.homeTeam &&
    payload.awayTeam &&
    payload.homeTeam === payload.awayTeam
  ) {
    throw new Error('Same team cannot play match');
  }

  return await Match.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

// DELETE
const deleteMatchFromDB = async (id: string) => {
  const match = await Match.findById(id);

  if (!match) {
    throw new Error('Match not found');
  }

  return await Match.findByIdAndDelete(id);
};

// TOGGLE STATUS
const toggleMatchStatusToDB = async (id: string) => {
  const match = await Match.findById(id);

  if (!match) {
    throw new Error('Match not found');
  }

  if (match.status === 'upcoming') {
    match.status = 'live';
  } else if (match.status === 'live') {
    match.status = 'finished';
  } else {
    match.status = 'upcoming';
  }

  await match.save();

  return match;
};

export const MatchService = {
  createMatchToDB,
  getAllMatchesFromDB,
  getSingleMatchFromDB,
  updateMatchToDB,
  deleteMatchFromDB,
  toggleMatchStatusToDB,
};
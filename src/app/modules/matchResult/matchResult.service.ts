import { MatchResult } from './matchResult.model';
import { PlayerStats } from '../playerStats/playerStats.model';

import { StatusCodes } from 'http-status-codes';
import QueryBuilder from '../../../util/queryBilter';
import ApiError from '../../../errors/ApiErrors';
import { Match } from '../match/match.model';

// ========================== CREATE ==========================
const createMatchResultToDB = async (payload: any) => {
  const { league, match, team, player, eventType, minute } = payload;

  // 1️⃣ VALIDATE MATCH
  const matchData = await Match.findById(match);
  if (!matchData) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Match not found');
  }

  // 2️⃣ VALIDATE LEAGUE
  if (String(matchData.league) !== String(league)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'League mismatch for this match');
  }

  // 3️⃣ VALIDATE TEAM IN MATCH
  const isTeamValid =
    String(matchData.homeTeam) === String(team) ||
    String(matchData.awayTeam) === String(team);

  if (!isTeamValid) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Team is not part of this match');
  }

  // 4️⃣ CHECK MATCH STATUS
  if (matchData.status !== 'live') {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Match is not running');
  }

  // 5️⃣ TIME VALIDATION
  const now = new Date();
  const matchStart = new Date(matchData.matchDate);

  const matchEndPlusExtra = new Date(matchStart);
  matchEndPlusExtra.setHours(matchEndPlusExtra.getHours() + 2);

  if (now > matchEndPlusExtra) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Match time expired, cannot update score');
  }

  // 6️⃣ MINUTE VALIDATION
  if (minute < 0 || minute > 120) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid match minute');
  }

  // 7️⃣ CREATE EVENT
  const result = await MatchResult.create(payload);

  // 8️⃣ UPDATE MATCH SCORE
  await applyMatchScore(payload);

  // 9️⃣ UPDATE PLAYER STATS
  await applyPlayerStats(payload);

  // 🔟 UPDATE WINNER
  await updateMatchWinner(match);

  return result;
};

// ========================== GET ALL ==========================
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

  return { meta, result };
};

// ========================== SINGLE ==========================
const getSingleMatchResultFromDB = async (id: string) => {
  const result = await MatchResult.findById(id)
    .populate('match')
    .populate('team')
    .populate('player')
    .populate('addedBy');

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Match event not found');
  }

  return result;
};

// ========================== UPDATE ==========================
const updateMatchResultToDB = async (id: string, payload: any) => {
  const existing = await MatchResult.findById(id);

  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Match event not found');
  }

  // rollback old
  await rollbackPlayerStats(existing);
  await rollbackMatchScore(existing);

  const updated = await MatchResult.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  if (updated) {
    await applyPlayerStats(updated);
    await applyMatchScore(updated);
    await updateMatchWinner(updated.match);
  }

  return updated;
};

// ========================== DELETE ==========================
const deleteMatchResultFromDB = async (id: string) => {
  const existing = await MatchResult.findById(id);

  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Match event not found');
  }

  await rollbackPlayerStats(existing);
  await rollbackMatchScore(existing);

  const deleted = await MatchResult.findByIdAndDelete(id);

  await updateMatchWinner(existing.match);

  return deleted;
};

// ========================== MATCH WISE ==========================
const getMatchWiseResultsFromDB = async (matchId: string) => {
  return await MatchResult.find({ match: matchId })
    .populate('team')
    .populate('player')
    .populate('addedBy')
    .sort({ minute: 1 });
};

// ============================================================
// 🔥 PLAYER STATS
// ============================================================
const applyPlayerStats = async (payload: any) => {
  const { player, team, eventType } = payload;

  if (!player) return;

  const inc: any = {};

  if (eventType === 'goal') inc.goals = 1;
  if (eventType === 'yellow_card') inc.yellowCards = 1;
  if (eventType === 'red_card') inc.redCards = 1;

  if (Object.keys(inc).length === 0) return;

  await PlayerStats.findOneAndUpdate(
    { player },
    { $inc: inc, $set: { team } },
    { upsert: true, new: true }
  );
};

const rollbackPlayerStats = async (payload: any) => {
  const { player, eventType } = payload;

  if (!player) return;

  const inc: any = {};

  if (eventType === 'goal') inc.goals = -1;
  if (eventType === 'yellow_card') inc.yellowCards = -1;
  if (eventType === 'red_card') inc.redCards = -1;

  if (Object.keys(inc).length === 0) return;

  await PlayerStats.findOneAndUpdate(
    { player },
    { $inc: inc }
  );
};

// ============================================================
// 🔥 MATCH SCORE LOGIC (NEW)
// ============================================================
const applyMatchScore = async (payload: any) => {
  const { match, team, eventType } = payload;

  if (eventType !== 'goal') return;

  const matchData = await Match.findById(match);
  if (!matchData) return;

  if (String(matchData.homeTeam) === String(team)) {
    await Match.findByIdAndUpdate(match, {
      $inc: { homeScore: 1 },
    });
  }

  if (String(matchData.awayTeam) === String(team)) {
    await Match.findByIdAndUpdate(match, {
      $inc: { awayScore: 1 },
    });
  }
};

const rollbackMatchScore = async (payload: any) => {
  const { match, team, eventType } = payload;

  if (eventType !== 'goal') return;

  const matchData = await Match.findById(match);
  if (!matchData) return;

  if (String(matchData.homeTeam) === String(team)) {
    await Match.findByIdAndUpdate(match, {
      $inc: { homeScore: -1 },
    });
  }

  if (String(matchData.awayTeam) === String(team)) {
    await Match.findByIdAndUpdate(match, {
      $inc: { awayScore: -1 },
    });
  }
};

// ============================================================
// 🔥 WINNER UPDATE (NEW)
// ============================================================
const updateMatchWinner = async (matchId: any) => {
  const match = await Match.findById(matchId);
  if (!match) return;

  let winnerTeam = null;

  if (match.homeScore > match.awayScore) {
    winnerTeam = match.homeTeam;
  } else if (match.awayScore > match.homeScore) {
    winnerTeam = match.awayTeam;
  }

  await Match.findByIdAndUpdate(matchId, {
    winnerTeam,
  });
};

// ============================================================
export const MatchResultService = {
  createMatchResultToDB,
  getAllMatchResultsFromDB,
  getSingleMatchResultFromDB,
  updateMatchResultToDB,
  deleteMatchResultFromDB,
  getMatchWiseResultsFromDB,
};
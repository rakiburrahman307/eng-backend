import { PlayerStats } from './playerStats.model';

// GET ALL (LEADERBOARD)
const getAllPlayerStatsFromDB = async () => {
  return await PlayerStats.find()
    .populate('player', 'name image email')
    .populate('team', 'teamName teamLogo')
    .sort({ goals: -1, assists: -1 });
};

// GET SINGLE PLAYER
const getSinglePlayerStatsFromDB = async (playerId: string) => {
  const result = await PlayerStats.findOne({ player: playerId })
    .populate('player', 'name image email')
    .populate('team', 'teamName teamLogo');

  return result || "No stats found for this player";
};

// ADMIN UPDATE
const updatePlayerStatsFromDB = async (
  playerId: string,
  payload: any
) => {
  const existing = await PlayerStats.findOne({ player: playerId });

  if (!existing) {
    throw new Error('Player stats not found');
  }

  return await PlayerStats.findOneAndUpdate(
    { player: playerId },
    {
      ...payload,
    },
    {
      new: true,
      runValidators: true,
    }
  );
};

export const PlayerStatsService = {
  getAllPlayerStatsFromDB,
  getSinglePlayerStatsFromDB,
  updatePlayerStatsFromDB,
};
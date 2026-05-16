import QueryBuilder from '../../../util/queryBilter';
import { Match } from './match.model';
import { LeagueTeam } from '../leagueTeam/leagueTeam.model';
import { User } from '../user/user.model';

const createMatchToDB = async (payload: any) => {
  const { league, homeTeam, awayTeam, matchDate, referee, venueName } = payload;

  // 1️⃣ same team check
  if (homeTeam === awayTeam) {
    throw new Error('Same team cannot play match');
  }

  // 2️⃣ league team validation
  const leagueTeams = await LeagueTeam.find({ league });

  const teamIds = leagueTeams.map((t) => t.team.toString());

  if (!teamIds.includes(homeTeam) || !teamIds.includes(awayTeam)) {
    throw new Error('Both teams must belong to this league');
  }

  // 3️⃣ referee existence check
  if (referee) {
    const refereeExists = await User.findById(referee);
    if (!refereeExists) {
      throw new Error('Referee not found');
    }
  }

  // 4️⃣ time setup
  const matchTime = new Date(matchDate).getTime();
  const twoHours = 2 * 60 * 60 * 1000;

  const startWindow = new Date(matchTime - twoHours);
  const endWindow = new Date(matchTime + twoHours);

  // 5️⃣ TEAM conflict check (home + away overlap)
  const teamConflict = await Match.findOne({
    league,
    matchDate: { $gte: startWindow, $lte: endWindow },
    $or: [
      { homeTeam },
      { awayTeam },
    ],
  });

  if (teamConflict) {
    throw new Error('One of the teams already has a match in this time slot');
  }

  // 6️⃣ REFEREE conflict check
  if (referee) {
    const refereeConflict = await Match.findOne({
      referee,
      matchDate: { $gte: startWindow, $lte: endWindow },
    });

    if (refereeConflict) {
      throw new Error('Referee already assigned in this time slot');
    }
  }

  // 7️⃣ VENUE conflict check (important for real system)
  if (venueName) {
    const venueConflict = await Match.findOne({
      venueName,
      matchDate: { $gte: startWindow, $lte: endWindow },
    });

    if (venueConflict) {
      throw new Error('Venue already booked in this time slot');
    }
  }

  // 8️⃣ create match
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
    match.status = 'finished';
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
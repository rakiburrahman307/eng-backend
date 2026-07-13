import QueryBuilder from "../../../util/queryBuilder";
import { Match } from "./match.model";
import { LeagueTeam } from "../leagueTeam/leagueTeam.model";
import { User } from "../user/user.model";
import { Team } from "../team/team.model";
import { getRatingCoin } from "../../../util/getRatingCoin";
import mongoose from "mongoose";
import { ManagerTeam } from "../managerTeam/managerTeam.model";

/* ---------------- RATING LOGIC ---------------- */

const createMatchToDB = async (payload: any) => {
  // single object হলে array বানাবে
  const matches = Array.isArray(payload) ? payload : [payload];

  const createdMatches: any[] = [];
  for (const matchData of matches) {
    const { league, homeTeam, awayTeam, matchDate, referee, venueName } =
      matchData;
    // same team check
    if (homeTeam === awayTeam) {
      throw new Error("Same team cannot play match");
    }
    // league team validation
    const leagueTeams = await LeagueTeam.find({
      league,
    });
    const teamIds = leagueTeams.map((t) => t.team.toString());
    if (!teamIds.includes(homeTeam) || !teamIds.includes(awayTeam)) {
      throw new Error("Both teams must belong to this league");
    }
    // referee check
    if (referee) {
      const refereeExists = await User.findById(referee);
      if (!refereeExists) {
        throw new Error("Referee not found");
      }
    }

    // time range
    const matchTime = new Date(matchDate).getTime();
    const twoHours = 2 * 60 * 60 * 1000;
    const startWindow = new Date(matchTime - twoHours);

    const endWindow = new Date(matchTime + twoHours);

    // team conflict

    const teamConflict = await Match.findOne({
      matchDate: {
        $gte: startWindow,
        $lte: endWindow,
      },

      $or: [
        {
          homeTeam,
        },
        {
          awayTeam,
        },
      ],
    });

    if (teamConflict) {
      throw new Error("One of the teams already has a match in this time slot");
    }

    // referee conflict

    if (referee) {
      const refereeConflict = await Match.findOne({
        referee,

        matchDate: {
          $gte: startWindow,
          $lte: endWindow,
        },
      });

      if (refereeConflict) {
        throw new Error("Referee already assigned in this time slot");
      }
    }

    // venue conflict

    if (venueName) {
      const venueConflict = await Match.findOne({
        venueName,

        matchDate: {
          $gte: startWindow,
          $lte: endWindow,
        },
      });
      if (venueConflict) {
        throw new Error("Venue already booked in this time slot");
      }
    }
    // create
    const match = await Match.create(matchData);
    createdMatches.push(match);
  }
  return createdMatches;
};

// GET ALL
const getAllMatchesFromDB = async (query: Record<string, any>) => {
  const matchQuery = new QueryBuilder(Match.find(), query)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await matchQuery.modelQuery
    .populate("homeTeam")
    .populate("awayTeam")
    .populate("referee")
    .populate("winnerTeam");

  const meta = await matchQuery.getPaginationInfo();

  return {
    meta,
    result,
  };
};

const getMatchesByRefereeFromDB = async (
  refereeId: string,
  query: Record<string, any>,
) => {
  const matchQuery = new QueryBuilder(Match.find({ referee: refereeId }), query)
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await matchQuery.modelQuery
    .populate("homeTeam")
    .populate("awayTeam")
    .populate("referee")
    .populate("winnerTeam");

  const meta = await matchQuery.getPaginationInfo();

  return {
    meta,
    result,
  };
};

// SINGLE
const getSingleMatchFromDB = async (id: string) => {
  const match = await Match.findById(id)
    .populate("homeTeam")
    .populate("awayTeam")
    .populate("referee")
    .populate("winnerTeam");

  if (!match) {
    throw new Error("Match not found");
  }

  return match;
};

// UPDATE
const updateMatchToDB = async (id: string, payload: any) => {
  const match = await Match.findById(id);

  if (!match) {
    throw new Error("Match not found");
  }

  if (
    payload.homeTeam &&
    payload.awayTeam &&
    payload.homeTeam === payload.awayTeam
  ) {
    throw new Error("Same team cannot play match");
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
    throw new Error("Match not found");
  }

  return await Match.findByIdAndDelete(id);
};

// TOGGLE STATUS
const toggleMatchStatusToDB = async (id: string) => {
  const match = await Match.findById(id);

  if (!match) {
    throw new Error("Match not found");
  }

  if (match.status === "upcoming") {
    match.status = "live";

    // LIVE START → GIVE BOTH TEAM 1000 COIN
    await Team.updateMany(
      { _id: { $in: [match.homeTeam, match.awayTeam] } },
      { $inc: { coin: 1000 } },
    );
  } else if (match.status === "live") {
    match.status = "half_time";
  } else if (match.status === "half_time") {
    match.status = "finished";
  } else {
    match.status = "finished";
  }

  await match.save();
  return match;
};

const addMatchReviewToDB = async (
  matchId: string,
  payload: {
    reviews: {
      team: string;
      rating: number;
    }[];
  },
) => {
  const match = await Match.findById(matchId);

  if (!match) throw new Error("Match not found");

  if (match.status !== "finished") {
    throw new Error("Only finished matches can be reviewed");
  }

  const reviewsWithCoin = payload.reviews.map((r) => ({
    team: r.team,
    rating: r.rating,
    coinImpact: getRatingCoin(r.rating),
  }));

  match.matchReview.push(...reviewsWithCoin);

  await match.save();

  for (const r of reviewsWithCoin) {
    await Team.findByIdAndUpdate(r.team, {
      $inc: { coin: r.coinImpact },
    });
  }

  return match;
};

const getUpcomingMatchesForManagerFromDB = async (
  managerId: string,
  query: Record<string, any>,
) => {
  const managerTeams = await ManagerTeam.find({
    manager: new mongoose.Types.ObjectId(managerId),
  });

  const teamIds = managerTeams.map((item) => item.team);

  const matchQuery = new QueryBuilder(
    Match.find({
      status: "upcoming",
      $or: [{ homeTeam: { $in: teamIds } }, { awayTeam: { $in: teamIds } }],
    }),
    query,
  )
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await matchQuery.modelQuery
    .populate("league")
    .populate("homeTeam")
    .populate("awayTeam")
    .populate("referee")
    .populate("winnerTeam");

  const meta = await matchQuery.getPaginationInfo();

  return {
    meta,
    result,
  };
};

export const MatchService = {
  createMatchToDB,
  getAllMatchesFromDB,
  getSingleMatchFromDB,
  updateMatchToDB,
  deleteMatchFromDB,
  toggleMatchStatusToDB,
  getMatchesByRefereeFromDB,
  addMatchReviewToDB,
  getUpcomingMatchesForManagerFromDB,
};

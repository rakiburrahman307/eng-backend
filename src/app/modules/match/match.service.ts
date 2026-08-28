import QueryBuilder from "../../../util/queryBuilder";
import { Match } from "./match.model";
import { LeagueTeam } from "../leagueTeam/leagueTeam.model";
import { User } from "../user/user.model";
import { Team } from "../team/team.model";
import { League } from "../league/league.model";
import { getRatingCoin } from "../../../util/getRatingCoin";
import mongoose from "mongoose";
import { ManagerTeam } from "../managerTeam/managerTeam.model";
import { NotificationQueueHelper } from "../../../helpers/bullMQ/bullHelper";
import { NOTIFICATION_TYPE } from "../notification/notification.interface";
import { socketService } from "../../../helpers/socket/service";
import { VenueCategory } from "../venueCategory/venueCategory.model";
import ApiError from "../../../errors/ApiErrors";
import { StatusCodes } from "http-status-codes";
import { ClubEconomy } from "../coinAndBudget/clubEconomySchema.model";
import { MatchResult } from "../matchResult/matchResult.model";
import { MatchResultService } from "../matchResult/matchResult.service";
import { MatchEvaluation } from "../refereeRating/refereeRating.model";
import { PlayerStats } from "../playerStats/playerStats.model";
import { PlayerEconomy } from "../coinAndBudget/playerEconomySchema.model";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const getUKNowInUTC = (): Date => {
  return dayjs().tz("Europe/London").utc().toDate();
};

const formatMatchVenue = async (matchItem: any) => {
  if (!matchItem) return matchItem;
  const matchObj = matchItem.toObject ? matchItem.toObject() : { ...matchItem };

  const parts: string[] = [];
  let rawVenueName = matchObj.venueName || "";

  // 1. If rawVenueName is a valid ObjectId, try finding its VenueCategory document
  if (rawVenueName && mongoose.Types.ObjectId.isValid(rawVenueName)) {
    const venueCatDoc = await VenueCategory.findById(rawVenueName).populate(
      "parentCategory",
      "name",
    );
    if (venueCatDoc) {
      if (
        venueCatDoc.parentCategory &&
        (venueCatDoc.parentCategory as any).name
      ) {
        parts.push((venueCatDoc.parentCategory as any).name);
      }
      parts.push(venueCatDoc.name);
      rawVenueName = ""; // reset since resolved
    }
  }

  // 2. Add raw text venueName if not ObjectId and not already included
  if (rawVenueName && !parts.includes(rawVenueName)) {
    parts.push(rawVenueName);
  }

  // 3. Add venueCategory name if present
  const catName = matchObj.venueCategory?.name || "";
  if (catName && !parts.includes(catName)) {
    parts.push(catName);
  }

  // 4. Add venueSubCategory name if present
  const subCatName = matchObj.venueSubCategory?.name || "";
  if (subCatName && !parts.includes(subCatName)) {
    parts.push(subCatName);
  }

  const finalVenueString =
    parts.length > 0 ? parts.join(", ") : matchObj.venueName || "";

  let liveSeconds = matchObj.elapsedSeconds || 0;
  if (matchObj.timerStatus === "running" && matchObj.timerStartedAt) {
    const diff = Math.floor(
      (Date.now() - new Date(matchObj.timerStartedAt).getTime()) / 1000,
    );
    if (diff > 0) liveSeconds += diff;
  }

  const durationMinutes = parseInt(matchObj.durationMinutes) || 90;

  return {
    ...matchObj,
    formation: matchObj.formation || null,
    venueName: finalVenueString,
    venue: finalVenueString,
    currentElapsedSeconds: liveSeconds,
    currentElapsedMinutes: Math.floor(liveSeconds / 60),
    totalDurationMinutes: durationMinutes,
    timerStatus: matchObj.timerStatus || "stopped",
    timerStartedAt: matchObj.timerStartedAt || null,
    elapsedSeconds: matchObj.elapsedSeconds || 0,
  };
};

/* ---------------- RATING LOGIC ---------------- */

const VALID_FORMATIONS = ["5 v 5", "7 v 7", "8 v 8", "9 v 9"];

const createMatchToDB = async (payload: any) => {
  // single object হলে array বানাবে
  const matches = Array.isArray(payload) ? payload : [payload];

  const createdMatches: any[] = [];
  for (const matchData of matches) {
    const {
      league,
      homeTeam,
      awayTeam,
      matchDate,
      referee,
      venueName,
      formation,
    } = matchData;

    // formation validation
    if (!formation) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Formation is required");
    }
    if (!VALID_FORMATIONS.includes(formation)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Invalid formation. Must be one of: ${VALID_FORMATIONS.join(", ")}`,
      );
    }

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
    // const startWindow = new Date(matchTime - twoHours);

    // const endWindow = new Date(matchTime + twoHours);

    // team conflict

    // const teamConflict = await Match.findOne({
    //   matchDate: {
    //     $gte: startWindow,
    //     $lte: endWindow,
    //   },

    //   $or: [
    //     {
    //       homeTeam,
    //     },
    //     {
    //       awayTeam,
    //     },
    //   ],
    // });

    // if (teamConflict) {
    //   throw new Error("One of the teams already has a match in this time slot");
    // }

    // referee conflict

    // if (referee) {
    //   const refereeConflict = await Match.findOne({
    //     referee,

    //     matchDate: {
    //       $gte: startWindow,
    //       $lte: endWindow,
    //     },
    //   });

    //   if (refereeConflict) {
    //     throw new Error("Referee already assigned in this time slot");
    //   }
    // }

    // create
    if (!matchData.scheduledAt && matchDate) {
      matchData.scheduledAt = new Date(matchDate);
    }
    if (matchData.venueName && mongoose.Types.ObjectId.isValid(matchData.venueName)) {
      matchData.venueCategory = matchData.venueName;
      const categoryDoc = await VenueCategory.findById(matchData.venueName);
      if (categoryDoc) {
        matchData.venueName = categoryDoc.name;
        
        const subVal = matchData.subVenue || matchData.pitch;
        if (subVal && mongoose.Types.ObjectId.isValid(subVal)) {
          matchData.venueSubCategory = subVal;
          const subCategoryObj = categoryDoc.subCategories?.find(
            (s: any) => s._id?.toString() === subVal.toString() || s.id?.toString() === subVal.toString()
          );
          if (subCategoryObj) {
            matchData.venueName = `${categoryDoc.name}, ${subCategoryObj.name}`;
          }
        }
      }
    } else {
      const subVal = matchData.subVenue || matchData.pitch;
      if (subVal && mongoose.Types.ObjectId.isValid(subVal)) {
        matchData.venueSubCategory = subVal;
      }
    }

    const match = await Match.create(matchData);
    createdMatches.push(match);
  }
  return createdMatches;
};

const getAllMatchesFromDB = async (query: Record<string, any>) => {
  const {
    teamId,
    team,
    teamName,
    leagueId,
    league,
    leagueName,
    status,
    dateStatus,
    matchDate,
    startDate,
    endDate,
    venue,
    venueName,
    venueCategory,
    venueSubCategory,
    subVenue,
    homeMatchesOnly,
    unplayedOnly,
    liveOnly,
    hasNotes,
    searchTerm,
    page,
    limit,
    sort,
  } = query;

  const andConditions: any[] = [];

  // League Filter (supports leagueId, league, leagueName)
  const targetLeague = leagueId || league || leagueName;
  if (
    targetLeague &&
    targetLeague !== "ALL" &&
    targetLeague !== "null" &&
    targetLeague !== "undefined"
  ) {
    let targetLeagueIds: any[] = [];
    let teamIdsInLeague: any[] = [];

    if (mongoose.Types.ObjectId.isValid(targetLeague)) {
      const objId = new mongoose.Types.ObjectId(targetLeague);

      // Find all LeagueTeams linked to this league
      const matchingLeagueTeams = await LeagueTeam.find({
        $or: [{ league: objId }, { _id: objId }],
      }).select("_id league team");

      const leagueTeamIds = matchingLeagueTeams.map((lt) => lt._id);
      const directLeagueIds = matchingLeagueTeams.map((lt) => lt.league);
      teamIdsInLeague = matchingLeagueTeams
        .map((lt) => lt.team)
        .filter(Boolean);

      const idStrings = Array.from(
        new Set(
          [
            objId.toString(),
            ...leagueTeamIds.map((id) => id.toString()),
            ...directLeagueIds.map((id) => id?.toString()),
          ].filter(Boolean),
        ),
      );

      targetLeagueIds = [
        ...idStrings.map(
          (idStr) => new mongoose.Types.ObjectId(idStr as string),
        ),
        ...idStrings,
      ];
    } else {
      const matchingLeagues = await League.find({
        leagueName: { $regex: targetLeague.trim(), $options: "i" },
      }).select("_id");
      const foundLeagueIds = matchingLeagues.map((l) => l._id);
      const matchingLeagueTeams = await LeagueTeam.find({
        league: { $in: foundLeagueIds },
      }).select("_id team");

      const leagueTeamIds = matchingLeagueTeams.map((lt) => lt._id);
      teamIdsInLeague = matchingLeagueTeams
        .map((lt) => lt.team)
        .filter(Boolean);

      const idStrings = Array.from(
        new Set(
          [
            ...foundLeagueIds.map((id) => id.toString()),
            ...leagueTeamIds.map((id) => id.toString()),
          ].filter(Boolean),
        ),
      );

      targetLeagueIds = [
        ...idStrings.map(
          (idStr) => new mongoose.Types.ObjectId(idStr as string),
        ),
        ...idStrings,
      ];
    }

    const allTeamIdRefs = [
      ...teamIdsInLeague,
      ...teamIdsInLeague.map((id) => id.toString()),
    ];

    andConditions.push({
      $or: [
        { league: { $in: targetLeagueIds } },
        ...(allTeamIdRefs.length > 0
          ? [{ homeTeam: { $in: allTeamIdRefs } }]
          : []),
        ...(allTeamIdRefs.length > 0
          ? [{ awayTeam: { $in: allTeamIdRefs } }]
          : []),
      ],
    });
  }

  // Team Filter (supports teamId, team, teamName, homeTeam, awayTeam)
  const targetTeam =
    teamId || teamName || team || query.homeTeam || query.awayTeam;
  if (
    targetTeam &&
    targetTeam !== "ALL" &&
    targetTeam !== "null" &&
    targetTeam !== "undefined"
  ) {
    let teamObjIds: any[] = [];
    let teamStrIds: string[] = [];

    if (mongoose.Types.ObjectId.isValid(targetTeam)) {
      teamObjIds = [new mongoose.Types.ObjectId(targetTeam)];
      teamStrIds = [targetTeam.toString()];
    } else {
      const matchingTeams = await Team.find({
        teamName: { $regex: targetTeam.trim(), $options: "i" },
      }).select("_id");
      teamObjIds = matchingTeams.map((t) => t._id);
      teamStrIds = matchingTeams.map((t) => t._id.toString());
    }

    const allTeamIds = [...teamObjIds, ...teamStrIds];

    if (homeMatchesOnly === "true" || homeMatchesOnly === true) {
      andConditions.push({ homeTeam: { $in: allTeamIds } });
    } else {
      andConditions.push({
        $or: [
          { homeTeam: { $in: allTeamIds } },
          { awayTeam: { $in: allTeamIds } },
        ],
      });
    }
  }

  // Status Filter (case-insensitive)
  if (status && status !== "ALL") {
    const lowerStatus = (status as string).toLowerCase();
    if (lowerStatus === "live") {
      andConditions.push({
        $or: [
          { status: { $regex: /^live$/i } },
          { status: "half_time" },
          { timerStatus: "running" },
          { timerStatus: "paused" },
        ],
      });
    } else if (lowerStatus === "upcoming" || lowerStatus === "scheduled") {
      andConditions.push({
        $or: [
          { status: { $regex: /^(upcoming|scheduled)$/i } },
          { status: { $ne: "finished" } },
        ],
      });
    } else {
      andConditions.push({
        status: { $regex: new RegExp(`^${lowerStatus}$`, "i") },
      });
    }
  }

  // Unplayed matches only
  if (unplayedOnly === "true" || unplayedOnly === true) {
    andConditions.push({ status: { $ne: "finished" } });
  }

  // Live matches only
  if (liveOnly === "true" || liveOnly === true) {
    andConditions.push({
      $or: [
        { status: { $regex: /^live$/i } },
        { status: "half_time" },
        { timerStatus: "running" },
        { timerStatus: "paused" },
      ],
    });
  }

  // Venue Filter
  const searchVenue = venueName || venue;
  if (searchVenue && searchVenue !== "ALL") {
    if (mongoose.Types.ObjectId.isValid(searchVenue)) {
      const venueDoc = await VenueCategory.findById(searchVenue);
      const subCats = await VenueCategory.find({
        $or: [{ parentCategory: searchVenue }, { _id: searchVenue }],
      });

      const allVenueIds = Array.from(
        new Set([
          searchVenue.toString(),
          ...subCats.map((s) => s._id.toString()),
        ]),
      );
      const allVenueNames = Array.from(
        new Set(
          [venueDoc?.name, ...subCats.map((s) => s.name)].filter(Boolean),
        ),
      );

      const regexConditions = allVenueNames.map((name) => ({
        venueName: { $regex: name, $options: "i" },
      }));

      andConditions.push({
        $or: [
          { venueName: { $in: allVenueIds } },
          { pitch: { $in: allVenueIds } },
          { subVenue: { $in: allVenueIds } },
          { venueCategory: { $in: allVenueIds } },
          { venueSubCategory: { $in: allVenueIds } },
          ...regexConditions,
        ],
      });
    } else {
      const venueDocs = await VenueCategory.find({
        name: { $regex: searchVenue, $options: "i" },
      });
      const venueIds = venueDocs.map((v) => v._id.toString());
      const parentIds = venueDocs.map((v) => v._id);

      const subCats = await VenueCategory.find({
        parentCategory: { $in: parentIds },
      });
      const allVenueIds = Array.from(
        new Set([...venueIds, ...subCats.map((s) => s._id.toString())]),
      );

      andConditions.push({
        $or: [
          { venueName: { $in: allVenueIds } },
          { pitch: { $in: allVenueIds } },
          { subVenue: { $in: allVenueIds } },
          { venueCategory: { $in: allVenueIds } },
          { venueSubCategory: { $in: allVenueIds } },
        ],
      });
    }
  }

  // Venue Category / Subcategory filter
  if (venueCategory || venueSubCategory || subVenue) {
    const venueFilterOr: any[] = [];
    if (venueCategory) {
      venueFilterOr.push({ venueCategory });
    }
    if (venueSubCategory) {
      venueFilterOr.push({ venueSubCategory });
    }
    if (subVenue) {
      venueFilterOr.push({ subVenue });
      venueFilterOr.push({ venueSubCategory: subVenue });
    }
    if (venueFilterOr.length > 0) {
      andConditions.push({ $or: venueFilterOr });
    }
  }

  // Date Status Filter
  const now = new Date();
  if (dateStatus && dateStatus !== "ALL") {
    if (dateStatus === "today") {
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      );
      const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      );
      andConditions.push({
        $or: [
          { matchDate: { $gte: startOfDay, $lte: endOfDay } },
          { scheduledAt: { $gte: startOfDay, $lte: endOfDay } },
        ],
      });
    } else if (dateStatus === "this_week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      andConditions.push({
        $or: [
          { matchDate: { $gte: startOfWeek, $lte: endOfWeek } },
          { scheduledAt: { $gte: startOfWeek, $lte: endOfWeek } },
        ],
      });
    } else if (dateStatus === "upcoming") {
      andConditions.push({
        $or: [{ matchDate: { $gte: now } }, { scheduledAt: { $gte: now } }],
      });
    } else if (dateStatus === "past") {
      andConditions.push({
        $or: [{ matchDate: { $lt: now } }, { scheduledAt: { $lt: now } }],
      });
    }
  }

  // Specific Day Filter (matchDate) -> Full 24-hour range
  if (matchDate) {
    const dateStr =
      typeof matchDate === "string" ? matchDate.split("T")[0] : "";
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
      const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
      andConditions.push({
        $or: [
          { matchDate: { $gte: startOfDay, $lte: endOfDay } },
          { scheduledAt: { $gte: startOfDay, $lte: endOfDay } },
        ],
      });
    } else {
      const d = new Date(matchDate as string);
      if (!isNaN(d.getTime())) {
        const startOfDay = new Date(d);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(d);
        endOfDay.setUTCHours(23, 59, 59, 999);
        andConditions.push({
          $or: [
            { matchDate: { $gte: startOfDay, $lte: endOfDay } },
            { scheduledAt: { $gte: startOfDay, $lte: endOfDay } },
          ],
        });
      }
    }
  }

  // Date Range Filter (supports startDate, endDate, from, to, start, end)
  const effectiveStartDate = startDate || query.from || query.start;
  const effectiveEndDate = endDate || query.to || query.end;

  if (effectiveStartDate || effectiveEndDate) {
    let startD: Date | null = null;
    let endD: Date | null = null;

    if (effectiveStartDate) {
      const sStr =
        typeof effectiveStartDate === "string"
          ? effectiveStartDate.split("T")[0]
          : "";
      if (sStr && /^\d{4}-\d{2}-\d{2}$/.test(sStr)) {
        startD = new Date(`${sStr}T00:00:00.000Z`);
      } else {
        const d = new Date(effectiveStartDate as string);
        if (!isNaN(d.getTime())) {
          startD = d;
        }
      }
    }

    if (effectiveEndDate) {
      const eStr =
        typeof effectiveEndDate === "string"
          ? effectiveEndDate.split("T")[0]
          : "";
      if (eStr && /^\d{4}-\d{2}-\d{2}$/.test(eStr)) {
        endD = new Date(`${eStr}T23:59:59.999Z`);
      } else {
        const d = new Date(effectiveEndDate as string);
        if (!isNaN(d.getTime())) {
          endD = d;
        }
      }
    }

    const dateQuery: any = {};
    if (startD && !isNaN(startD.getTime())) {
      dateQuery.$gte = startD;
    }
    if (endD && !isNaN(endD.getTime())) {
      dateQuery.$lte = endD;
    }

    if (dateQuery.$gte || dateQuery.$lte) {
      andConditions.push({
        $or: [{ matchDate: dateQuery }, { scheduledAt: dateQuery }],
      });
    }
  }

  // SearchTerm Filter (Regex on teamName, leagueName, venueName, notes, status)
  if (
    searchTerm &&
    typeof searchTerm === "string" &&
    searchTerm.trim() !== ""
  ) {
    const searchRegex = { $regex: searchTerm.trim(), $options: "i" };

    const [matchingTeams, matchingLeagues] = await Promise.all([
      Team.find({ teamName: searchRegex }).select("_id"),
      League.find({ leagueName: searchRegex }).select("_id"),
    ]);

    const teamIds = matchingTeams.map((t) => t._id);
    const leagueIds = matchingLeagues.map((l) => l._id);

    andConditions.push({
      $or: [
        { homeTeam: { $in: teamIds } },
        { awayTeam: { $in: teamIds } },
        { league: { $in: leagueIds } },
        { venueName: searchRegex },
        { status: searchRegex },
        { notes: searchRegex },
      ],
    });
  }

  const initialFilter = andConditions.length > 0 ? { $and: andConditions } : {};

  // Pagination calculation
  const pageNumber = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNumber = Math.max(1, parseInt(limit as string, 10) || 10);
  const skip = (pageNumber - 1) * limitNumber;

  // Count matching documents for pagination
  const total = await Match.countDocuments(initialFilter);
  const totalPage = Math.ceil(total / limitNumber) || 1;

  // Sorting
  const sortField = (sort as string) || "matchDate";

  const matches = await Match.find(initialFilter)
    .sort(sortField)
    .skip(skip)
    .limit(limitNumber)
    .populate("league")
    .populate("homeTeam")
    .populate("awayTeam")
    .populate("referee")
    .populate("winnerTeam")
    .populate("venueCategory", "name")
    .populate("venueSubCategory", "name");

  const formattedResult = await Promise.all(
    matches.map((m: any) => formatMatchVenue(m)),
  );

  return {
    meta: {
      total,
      limit: limitNumber,
      page: pageNumber,
      totalPage,
    },
    result: formattedResult,
  };
};

const getMatchesByRefereeFromDB = async (
  refereeId: string,
  query: Record<string, any>,
) => {
  const pageNumber = Math.max(1, parseInt(query.page as string, 10) || 1);
  const limitNumber = Math.max(1, parseInt(query.limit as string, 10) || 10);
  const skip = (pageNumber - 1) * limitNumber;

  const filter = { referee: refereeId };
  const total = await Match.countDocuments(filter);
  const totalPage = Math.ceil(total / limitNumber) || 1;

  const matches = await Match.find(filter)
    .sort(query.sort || "matchDate")
    .skip(skip)
    .limit(limitNumber)
    .populate("league")
    .populate("homeTeam")
    .populate("awayTeam")
    .populate("referee")
    .populate("winnerTeam")
    .populate("venueCategory", "name")
    .populate("venueSubCategory", "name");

  const formattedResult = await Promise.all(
    matches.map((m: any) => formatMatchVenue(m)),
  );

  return {
    meta: {
      total,
      limit: limitNumber,
      page: pageNumber,
      totalPage,
    },
    result: formattedResult,
  };
};

// SINGLE
const getSingleMatchFromDB = async (id: string) => {
  const match = await Match.findById(id)
    .populate("league")
    .populate("homeTeam")
    .populate("awayTeam")
    .populate("referee")
    .populate("winnerTeam")
    .populate("venueCategory", "name")
    .populate("venueSubCategory", "name");

  if (!match) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Match not found");
  }

  // Use the existing formatMatchVenue helper to ensure all dynamic fields (venueName, liveSeconds, etc.) are correctly formatted
  const baseMatch = await formatMatchVenue(match);

  // Fetch match events, referee report, and managers for home and away teams in parallel
  const [matchEvents, evaluation, homeManagerDoc, awayManagerDoc] =
    await Promise.all([
      MatchResult.find({ match: id })
        .populate("player", "firstName lastName profile")
        .populate("eventMeta.assist", "firstName lastName"),
      MatchEvaluation.findOne({ match: id }).populate(
        "manOfTheMatch",
        "firstName lastName profile",
      ),
      match.homeTeam?._id
        ? ManagerTeam.findOne({ team: match.homeTeam._id }).populate(
            "manager",
            "firstName lastName userName profile",
          )
        : Promise.resolve(null),
      match.awayTeam?._id
        ? ManagerTeam.findOne({ team: match.awayTeam._id }).populate(
            "manager",
            "firstName lastName userName profile",
          )
        : Promise.resolve(null),
    ]);

  // Format Goals
  const goals = matchEvents
    .filter((e) => e.eventType === "goal")
    .map((e) => ({
      _id: e._id,
      team: e.team,
      isHome: String(e.team) === String(match.homeTeam?._id),
      minute: e.minute,
      goalType: e.eventMeta?.goalType || null,
      player: e.player
        ? {
            _id: e.player._id,
            firstName: (e.player as any).firstName || "",
            lastName: (e.player as any).lastName || "",
            profile: (e.player as any).profile || null,
          }
        : null,
      assist: e.eventMeta?.assist
        ? {
            _id: (e.eventMeta.assist as any)._id,
            firstName: (e.eventMeta.assist as any).firstName || "",
            lastName: (e.eventMeta.assist as any).lastName || "",
          }
        : null,
    }));

  // Format Cards
  const cards = matchEvents
    .filter((e) => e.eventType === "yellow_card" || e.eventType === "red_card")
    .map((e) => ({
      _id: e._id,
      team: e.team,
      isHome: String(e.team) === String(match.homeTeam?._id),
      minute: e.minute,
      cardType: e.eventType === "yellow_card" ? "yellow" : "red",
      player: e.player
        ? {
            _id: e.player._id,
            firstName: (e.player as any).firstName || "",
            lastName: (e.player as any).lastName || "",
          }
        : null,
    }));

  // Format Referee Report
  const refereeReport = evaluation
    ? {
        homeTeamRating: evaluation.homeTeamRating,
        awayTeamRating: evaluation.awayTeamRating,
        manOfTheMatch: evaluation.manOfTheMatch
          ? {
              _id: evaluation.manOfTheMatch._id,
              firstName: (evaluation.manOfTheMatch as any).firstName || "",
              lastName: (evaluation.manOfTheMatch as any).lastName || "",
              profile: (evaluation.manOfTheMatch as any).profile || null,
              jerseyNumber: (evaluation.manOfTheMatch as any).jerseyNumber || null,
            }
          : null,
      }
    : null;

  // Format referee object
  const refereeObj =
    match.referee && typeof match.referee === "object"
      ? {
          _id: match.referee._id,
          firstName: (match.referee as any).firstName || "",
          lastName: (match.referee as any).lastName || "",
          userName: (match.referee as any).userName || "",
          profile: (match.referee as any).profile || null,
        }
      : null;

  // Construct final response data matching the exact requested JSON structure
  return {
    _id: baseMatch._id,
    league: baseMatch.league
      ? {
          _id: baseMatch.league._id,
          leagueName: baseMatch.league.leagueName,
          season: baseMatch.league.season,
        }
      : null,
    matchDate: baseMatch.matchDate,
    venueName: baseMatch.venueName,
    venueCategory: baseMatch.venueCategory || null,
    venueSubCategory: baseMatch.venueSubCategory || null,
    durationMinutes: baseMatch.durationMinutes || null,
    formation: baseMatch.formation || null,
    status: baseMatch.status,
    period: baseMatch.period,
    referee: refereeObj,
    homeScore: baseMatch.homeScore,
    awayScore: baseMatch.awayScore,
    homeTeam: baseMatch.homeTeam
      ? {
          _id: baseMatch.homeTeam._id,
          teamName: baseMatch.homeTeam.teamName,
          shortName: baseMatch.homeTeam.shortName,
          teamLogo: baseMatch.homeTeam.teamLogo,
          manager:
            homeManagerDoc && homeManagerDoc.manager
              ? {
                  _id: (homeManagerDoc.manager as any)._id,
                  firstName: (homeManagerDoc.manager as any).firstName || "",
                  lastName: (homeManagerDoc.manager as any).lastName || "",
                  userName: (homeManagerDoc.manager as any).userName || "",
                  profile: (homeManagerDoc.manager as any).profile || null,
                }
              : null,
        }
      : null,
    awayTeam: baseMatch.awayTeam
      ? {
          _id: baseMatch.awayTeam._id,
          teamName: baseMatch.awayTeam.teamName,
          shortName: baseMatch.awayTeam.shortName,
          teamLogo: baseMatch.awayTeam.teamLogo,
          manager:
            awayManagerDoc && awayManagerDoc.manager
              ? {
                  _id: (awayManagerDoc.manager as any)._id,
                  firstName: (awayManagerDoc.manager as any).firstName || "",
                  lastName: (awayManagerDoc.manager as any).lastName || "",
                  userName: (awayManagerDoc.manager as any).userName || "",
                  profile: (awayManagerDoc.manager as any).profile || null,
                }
              : null,
        }
      : null,
    goals,
    cards,
    refereeReport,
    timerStatus: baseMatch.timerStatus,
    timerStartedAt: baseMatch.timerStartedAt,
    elapsedSeconds: baseMatch.elapsedSeconds || 0,
    currentElapsedSeconds: baseMatch.currentElapsedSeconds,
    currentElapsedMinutes: baseMatch.currentElapsedMinutes,
    totalDurationMinutes: baseMatch.totalDurationMinutes,
  };
};

// UPDATE
const updateMatchToDB = async (id: string, payload: any) => {
  const match = await Match.findById(id);

  if (!match) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Match not found");
  }

  if (
    payload.homeTeam &&
    payload.awayTeam &&
    payload.homeTeam === payload.awayTeam
  ) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Same team cannot play match");
  }

  const dateFields = [
    "scheduledAt",
    "startedAt",
    "firstHalfStartedAt",
    "halfTimeAt",
    "secondHalfStartedAt",
    "finishedAt",
  ];
  dateFields.forEach((field) => {
    if (payload[field] !== undefined) {
      payload[field] = payload[field] ? new Date(payload[field]) : null;
    }
  });
  if (payload.venueName && mongoose.Types.ObjectId.isValid(payload.venueName)) {
    payload.venueCategory = payload.venueName;
    const categoryDoc = await VenueCategory.findById(payload.venueName);
    if (categoryDoc) {
      payload.venueName = categoryDoc.name;
      
      const subVal = payload.subVenue || payload.pitch;
      if (subVal && mongoose.Types.ObjectId.isValid(subVal)) {
        payload.venueSubCategory = subVal;
        const subCategoryObj = categoryDoc.subCategories?.find(
          (s: any) => s._id?.toString() === subVal.toString() || s.id?.toString() === subVal.toString()
        );
        if (subCategoryObj) {
          payload.venueName = `${categoryDoc.name}, ${subCategoryObj.name}`;
        }
      }
    }
  } else if (payload.venueName === "") {
    payload.venueCategory = null;
  }
  
  const subVal = payload.subVenue || payload.pitch;
  if (subVal && mongoose.Types.ObjectId.isValid(subVal)) {
    payload.venueSubCategory = subVal;
  } else if (subVal === "" || subVal === undefined) {
    payload.venueSubCategory = null;
  }

  const updatedMatch = await Match.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  if (!updatedMatch) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to update match");
  }

  await emitMatchUpdate(id);

  return await formatMatchVenue(updatedMatch);
};

// DELETE
const deleteMatchFromDB = async (id: string) => {
  const match = await Match.findById(id);

  if (!match) {
    throw new Error("Match not found");
  }

  // 1. Rollback all match events (goals/assists/cards, reducing player stats & reversing user coins)
  await MatchResultService.rollbackAllResultsForMatch(id);

  // 2. Clean up referee ratings/evaluations for this match
  await MatchEvaluation.deleteMany({ match: id });

  // 3. Delete the match document itself
  const deleted = await Match.findByIdAndDelete(id);
  if (deleted) {
    if ((global as any).io) {
      (global as any).io.emit("matches_list_update", { _id: id, deleted: true });
    }
  }
  return deleted;
};

// TOGGLE STATUS (Sequence: scheduled -> live (1st half) -> half_time -> live (2nd half) -> finished)
const toggleMatchStatusToDB = async (id: string, userRole: string = "") => {
  const match = await Match.findById(id);

  if (!match) {
    throw new Error("Match not found");
  }

  let nextStatus = "live";
  let nextPeriod = match.period;

  if (match.status === "scheduled" || match.status === "upcoming") {
    nextStatus = "live";
    nextPeriod = "first_half";
  } else if (
    match.status === "live" &&
    (match.period === "first_half" || !match.period)
  ) {
    nextStatus = "half_time";
    nextPeriod = "first_half";
  } else if (match.status === "half_time") {
    nextStatus = "live";
    nextPeriod = "second_half";
  } else if (match.status === "live" && match.period === "second_half") {
    nextStatus = "finished";
    nextPeriod = "second_half";
  } else {
    nextStatus = "finished";
    nextPeriod = "second_half";
  }

  return await updateMatchStatusInDB(
    id,
    { status: nextStatus, period: nextPeriod },
    userRole,
  );
};

const updateMatchStatusInDB = async (
  id: string,
  payload: any,
  userRole: string = "",
) => {
  const match = await Match.findById(id);

  if (!match) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Match not found");
  }

  const roleUpper = (userRole || "").toString().trim().toUpperCase();
  const isAdmin = roleUpper === "ADMIN" || roleUpper === "SUPER_ADMIN";

  const targetStatus =
    typeof payload === "string"
      ? payload.toLowerCase()
      : (payload?.status || "").toLowerCase();
  const targetPeriod =
    typeof payload === "object" ? payload?.period : undefined;

  const validStatuses = [
    "scheduled",
    "upcoming",
    "live",
    "half_time",
    "finished",
    "cancelled",
  ];
  if (!validStatuses.includes(targetStatus)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    );
  }

  const oldStatus = match.status;
  const ukNow = getUKNowInUTC();

  // Referee check for starting match (in non-admin flow)
  if ((targetStatus === "live" || targetPeriod === "first_half") && !isAdmin) {
    if (!match.referee) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "A referee must be assigned to the match before making it live",
      );
    }
  }

  // 1️⃣ Status & Period Transitioning & Automatic Server Timestamping
  if (targetStatus === "scheduled" || targetStatus === "upcoming") {
    match.status = targetStatus as any;
    match.period = targetPeriod !== undefined ? targetPeriod : null;
    if (!match.scheduledAt) {
      match.scheduledAt = match.matchDate || ukNow;
    }
  } else if (targetStatus === "live") {
    match.status = "live";
    const requestedPeriod =
      targetPeriod ||
      (oldStatus === "half_time" ? "second_half" : "first_half");
    match.period = requestedPeriod as any;

    if (requestedPeriod === "first_half") {
      if (!match.startedAt) match.startedAt = ukNow;
      if (!match.firstHalfStartedAt || isAdmin)
        match.firstHalfStartedAt = ukNow;
      match.elapsedSeconds = 0; // reset on new first half start
    } else if (requestedPeriod === "second_half") {
      if (!match.secondHalfStartedAt || isAdmin)
        match.secondHalfStartedAt = ukNow;
      match.elapsedSeconds = 0; // restart to 0 for second half
    }

    // Automatically run the match timer
    match.timerStatus = "running";
    match.timerStartedAt = ukNow;

    // 🪙 1000 Coin Awarding Logic (Strictly Once)
    if (!match.coinAwarded) {
      await Team.updateMany(
        { _id: { $in: [match.homeTeam, match.awayTeam] } },
        { $inc: { coin: 1000 } },
      );
      match.coinAwarded = true;
    }
  } else if (targetStatus === "half_time") {
    // Accumulate elapsed seconds if timer was running
    if (match.timerStatus === "running" && match.timerStartedAt) {
      const diff = Math.floor(
        (ukNow.getTime() - new Date(match.timerStartedAt).getTime()) / 1000,
      );
      if (diff > 0) {
        match.elapsedSeconds = (match.elapsedSeconds || 0) + diff;
      }
    }
    match.status = "half_time";
    match.period = targetPeriod || "first_half";
    if (!match.halfTimeAt || isAdmin) {
      match.halfTimeAt = ukNow;
    }
    // Pause timer
    match.timerStatus = "paused";
    match.timerStartedAt = null;
  } else if (targetStatus === "finished") {
    // Accumulate elapsed seconds if timer was running
    if (match.timerStatus === "running" && match.timerStartedAt) {
      const diff = Math.floor(
        (ukNow.getTime() - new Date(match.timerStartedAt).getTime()) / 1000,
      );
      if (diff > 0) {
        match.elapsedSeconds = (match.elapsedSeconds || 0) + diff;
      }
    }
    match.status = "finished";
    match.period = targetPeriod || "second_half";
    if (!match.finishedAt || isAdmin) {
      match.finishedAt = ukNow;
    }
    // Stop/finish timer
    match.timerStatus = "finished";
    match.timerStartedAt = null;
  } else if (targetStatus === "cancelled") {
    match.status = "cancelled";
    match.timerStatus = "stopped";
    match.timerStartedAt = null;
  }

  // 2️⃣ Allow Admin to manually overwrite timestamps & state
  if (isAdmin && typeof payload === "object") {
    if (payload.scheduledAt !== undefined)
      match.scheduledAt = payload.scheduledAt
        ? new Date(payload.scheduledAt)
        : null;
    if (payload.startedAt !== undefined)
      match.startedAt = payload.startedAt ? new Date(payload.startedAt) : null;
    if (payload.firstHalfStartedAt !== undefined)
      match.firstHalfStartedAt = payload.firstHalfStartedAt
        ? new Date(payload.firstHalfStartedAt)
        : null;
    if (payload.halfTimeAt !== undefined)
      match.halfTimeAt = payload.halfTimeAt
        ? new Date(payload.halfTimeAt)
        : null;
    if (payload.secondHalfStartedAt !== undefined)
      match.secondHalfStartedAt = payload.secondHalfStartedAt
        ? new Date(payload.secondHalfStartedAt)
        : null;
    if (payload.finishedAt !== undefined)
      match.finishedAt = payload.finishedAt
        ? new Date(payload.finishedAt)
        : null;
    if (payload.period !== undefined) match.period = payload.period;
  }

  await match.save();

  // Send notifications if status has changed significantly
  if (
    (targetStatus === "live" || targetStatus === "finished") &&
    oldStatus !== targetStatus &&
    !isAdmin
  ) {
    try {
      const homeTeam = await Team.findById(match.homeTeam);
      const awayTeam = await Team.findById(match.awayTeam);
      const matchName = `${homeTeam?.teamName || "Home Team"} vs ${awayTeam?.teamName || "Away Team"}`;

      const userDetails = await User.find({
        selectTeam: { $in: [match.homeTeam, match.awayTeam] },
      });

      if (userDetails.length > 0) {
        const title =
          targetStatus === "live" ? "Match is Live! ⚽" : "Match Finished! 🏁";
        const message =
          targetStatus === "live"
            ? `The match ${matchName} has officially started and is now live!`
            : `The match ${matchName} has finished. Check the final match results and ratings.`;

        const userIds = userDetails.map((u) => u._id.toString());

        await NotificationQueueHelper.sendBulkNotifications(
          userIds,
          title,
          message,
          NOTIFICATION_TYPE.MATCH_RESULT_PUBLISHED,
          undefined,
          match._id.toString(),
          "Match",
        );
      }
    } catch (err) {
      console.error("Failed to send status update notification", err);
    }
  }

  await emitMatchUpdate(match._id.toString());

  return await formatMatchVenue(match);
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

  const matches = await matchQuery.modelQuery
    .populate("league")
    .populate("homeTeam")
    .populate("awayTeam")
    .populate("referee")
    .populate("winnerTeam")
    .populate("venueCategory", "name")
    .populate("venueSubCategory", "name");

  const meta = await matchQuery.getPaginationInfo();
  const formattedResult = await Promise.all(
    matches.map((m: any) => formatMatchVenue(m)),
  );

  return {
    meta,
    result: formattedResult,
  };
};

const updateMatchTimerInDB = async (    
  matchId: string,
  action: "START" | "PAUSE" | "RESUME" | "FINISH",
  user?: any,
) => {
  const match = await Match.findById(matchId);

  if (!match) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Match not found");
  }

  const now = new Date();
  let elapsed = match.elapsedSeconds || 0;

  // Accumulate segment elapsed time if timer was running
  if (match.timerStatus === "running" && match.timerStartedAt) {
    const diffSeconds = Math.floor(
      (now.getTime() - new Date(match.timerStartedAt).getTime()) / 1000,
    );
    if (diffSeconds > 0) {
      elapsed += diffSeconds;
    }
  }

  switch (action) {
    case "START":
      if (!match.referee) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          "A referee must be assigned to the match before starting the match timer",
        );
      }
      match.timerStatus = "running";
      match.timerStartedAt = now;
      match.elapsedSeconds = 0;
      match.status = "live";
      break;

    case "PAUSE":
      match.timerStatus = "paused";
      match.timerStartedAt = null;
      match.elapsedSeconds = elapsed;
      match.status = "live";
      break;

    case "RESUME":
      match.timerStatus = "running";
      match.timerStartedAt = now;
      match.elapsedSeconds = elapsed;
      match.status = "live";
      break;

    case "FINISH":
      match.timerStatus = "finished";
      match.timerStartedAt = null;
      match.elapsedSeconds = elapsed;
      match.status = "finished";
      break;

    default:
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        "Invalid timer action. Valid actions: START, PAUSE, RESUME, FINISH",
      );
  }

  await match.save();

  // Calculate live current elapsed for instant response & socket emit
  let liveSeconds = match.elapsedSeconds || 0;
  if (match.timerStatus === "running" && match.timerStartedAt) {
    const diff = Math.floor(
      (Date.now() - new Date(match.timerStartedAt).getTime()) / 1000,
    );
    if (diff > 0) liveSeconds += diff;
  }

  // 📡 Socket broadcast
  const io = socketService.io;
  if (io) {
    io.emit(`match_${matchId}_timer`, {
      matchId,
      action,
      timerStatus: match.timerStatus,
      elapsedSeconds: match.elapsedSeconds,
      currentElapsedSeconds: liveSeconds,
      currentElapsedMinutes: Math.floor(liveSeconds / 60),
      timerStartedAt: match.timerStartedAt,
      status: match.status,
      durationMinutes: match.durationMinutes,
    });
  }

  await emitMatchUpdate(matchId);

  const formatted = await formatMatchVenue(match);
  return {
    ...formatted,
    currentElapsedSeconds: liveSeconds,
    currentElapsedMinutes: Math.floor(liveSeconds / 60),
  };
};

const modifyMatchScoreInDB = async (
  id: string,
  payload: {
    homeScore: number;
    awayScore: number;
    goalScorers?: Array<{
      team: string;
      player: string;
      assistPlayer?: string;
      goalType?: 'normal' | 'penalty' | 'header' | 'own_goal' | 'free_kick';
      minute?: number;
    }>;
  },
) => {
  const match = await Match.findById(id);

  if (!match) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Match not found");
  }

  if (payload.homeScore === undefined || payload.awayScore === undefined) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Both homeScore and awayScore must be provided",
    );
  }

  const oldHomeScore = match.homeScore ?? 0;
  const oldAwayScore = match.awayScore ?? 0;
  const newHomeScore = Number(payload.homeScore);
  const newAwayScore = Number(payload.awayScore);

  let newWinnerTeam = null;
  if (newHomeScore > newAwayScore) {
    newWinnerTeam = match.homeTeam;
  } else if (newAwayScore > newHomeScore) {
    newWinnerTeam = match.awayTeam;
  }

  // If the match is already finished, adjust team coins & market value rewards
  if (match.status === "finished") {
    const ce = await ClubEconomy.findOne();
    const drawCoin = ce?.drawMatch?.coin ?? 2000;
    const drawMV = ce?.drawMatch?.budgetValue ?? 20000;
    const winCoin = ce?.winMatch?.coin ?? 5000;
    const winMV = ce?.winMatch?.budgetValue ?? 50000;

    // Rollback old coin/MV allocations
    if (oldHomeScore === oldAwayScore) {
      await Team.findByIdAndUpdate(match.homeTeam, {
        $inc: { coin: -drawCoin, marketValue: -drawMV },
      });
      await Team.findByIdAndUpdate(match.awayTeam, {
        $inc: { coin: -drawCoin, marketValue: -drawMV },
      });
    } else {
      const oldWinner =
        oldHomeScore > oldAwayScore ? match.homeTeam : match.awayTeam;
      await Team.findByIdAndUpdate(oldWinner, {
        $inc: { coin: -winCoin, marketValue: -winMV },
      });
    }

    // Apply new coin/MV allocations
    if (newHomeScore === newAwayScore) {
      await Team.findByIdAndUpdate(match.homeTeam, {
        $inc: { coin: drawCoin, marketValue: drawMV },
      });
      await Team.findByIdAndUpdate(match.awayTeam, {
        $inc: { coin: drawCoin, marketValue: drawMV },
      });
    } else {
      await Team.findByIdAndUpdate(newWinnerTeam, {
        $inc: { coin: winCoin, marketValue: winMV },
      });
    }
  }

  // Handle assigned goal scorers for player stats, coins & notifications
  if (Array.isArray(payload.goalScorers) && payload.goalScorers.length > 0) {
    const pe = await PlayerEconomy.findOne();
    const goalCoin = pe?.goal?.coin ?? 2000;
    const goalMV = pe?.goal?.marketValue ?? 20000;
    const assistCoin = pe?.assist?.coin ?? 1000;
    const assistMV = pe?.assist?.marketValue ?? 10000;

    for (const scorer of payload.goalScorers) {
      if (scorer.player && scorer.team) {
        const min = Number(scorer.minute) || 1;

        // 1. Create MatchResult
        await MatchResult.create({
          match: match._id,
          league: match.league,
          team: scorer.team,
          player: scorer.player,
          eventType: "goal",
          minute: min,
          addedBy: scorer.player,
          eventMeta: {
            goalType: scorer.goalType || "normal",
            ...(scorer.assistPlayer ? { assist: scorer.assistPlayer } : {}),
          },
        });

        // 2. Increment player stats
        await PlayerStats.findOneAndUpdate(
          { player: scorer.player },
          { $inc: { goals: 1 }, $set: { team: scorer.team } },
          { upsert: true, new: true },
        );

        // 3. Increment player coins & MV
        const scorerUser = await User.findById(scorer.player);
        if (scorerUser) {
          await User.findByIdAndUpdate(scorer.player, {
            $inc: { engCoine: goalCoin, marketValue: goalMV },
          });
        }

        // 4. Handle assist if provided
        if (scorer.assistPlayer) {
          await PlayerStats.findOneAndUpdate(
            { player: scorer.assistPlayer },
            { $inc: { assists: 1 } },
            { upsert: true, new: true },
          );
          const assistUser = await User.findById(scorer.assistPlayer);
          if (assistUser) {
            await User.findByIdAndUpdate(scorer.assistPlayer, {
              $inc: { engCoine: assistCoin, marketValue: assistMV },
            });
          }
        }

        // 5. Send notifications
        try {
          await NotificationQueueHelper.sendNotification(
            String(scorer.player),
            `Congratulations! You scored a goal at minute ${min}.`,
            "Goal Scored! ⚽",
            NOTIFICATION_TYPE.MATCH_RESULT_PUBLISHED,
          );
          if (scorer.assistPlayer) {
            await NotificationQueueHelper.sendNotification(
              String(scorer.assistPlayer),
              `Well done! You assisted a goal at minute ${min}.`,
              "Assist Recorded! 👟⚽",
              NOTIFICATION_TYPE.MATCH_RESULT_PUBLISHED,
            );
          }
        } catch (err) {
          console.error("Failed to send goal notification", err);
        }
      }
    }
  }

  match.homeScore = newHomeScore;
  match.awayScore = newAwayScore;
  match.winnerTeam = newWinnerTeam as any;

  await match.save();

  await emitMatchUpdate(match._id.toString());

  return await formatMatchVenue(match);
};

export const emitMatchUpdate = async (matchId: string) => {
  try {
    const match = await Match.findById(matchId)
      .populate("league")
      .populate("homeTeam")
      .populate("awayTeam")
      .populate("referee")
      .populate("winnerTeam")
      .populate("venueCategory", "name")
      .populate("venueSubCategory", "name");

    if (!match) return;

    const formatted = await formatMatchVenue(match);

    const io = socketService.io;
    if (io) {
      // 1. Emit deep populated match object to the specific match room
      io.to(`match_${matchId}`).emit("match_update", formatted);

      // 2. Emit lightweight payload to the global list channel
      const lightweightPayload = {
        _id: formatted._id,
        homeScore: formatted.homeScore,
        awayScore: formatted.awayScore,
        status: formatted.status,
        period: formatted.period,
        elapsedSeconds: formatted.elapsedSeconds,
        currentElapsedSeconds: formatted.currentElapsedSeconds,
        currentElapsedMinutes: formatted.currentElapsedMinutes,
        timerStatus: formatted.timerStatus,
        timerStartedAt: formatted.timerStartedAt,
      };
      io.emit("matches_list_update", lightweightPayload);
    }
  } catch (error) {
    console.error("❌ Failed to emit match update:", error);
  }
};

export const MatchService = {
  createMatchToDB,
  getAllMatchesFromDB,
  getSingleMatchFromDB,
  updateMatchToDB,
  deleteMatchFromDB,
  toggleMatchStatusToDB,
  updateMatchStatusInDB,
  getMatchesByRefereeFromDB,
  addMatchReviewToDB,
  getUpcomingMatchesForManagerFromDB,
  updateMatchTimerInDB,
  modifyMatchScoreInDB,
};

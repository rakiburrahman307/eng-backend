import mongoose, { Types } from "mongoose";
import { Match } from "../app/modules/match/match.model";
import { Team } from "../app/modules/team/team.model";
import { User } from "../app/modules/user/user.model";
import { MatchPlayerSelection } from "../app/modules/matchPlayerSelection/matchPlayerSelection.model";
import { MatchResult } from "../app/modules/matchResult/matchResult.model";
import { PlayerStats } from "../app/modules/playerStats/playerStats.model";
import { PlayerEconomy } from "../app/modules/coinAndBudget/playerEconomySchema.model";
import { isUserPremiumPlayer } from "./packageHelper";
import { recordCoinTransaction } from "./coinLedgerHelper";
import { COIN_TRANSACTION_CATEGORY } from "../app/modules/coinTransaction/coinTransaction.interface";

const isGKOrDefender = (positionStr?: string | null): boolean => {
  if (!positionStr) return false;
  const pos = positionStr.trim().toLowerCase();
  return (
    pos === "gk" ||
    pos === "goalkeeper" ||
    pos === "goal keeper" ||
    pos === "df" ||
    pos === "defender" ||
    pos === "defenders" ||
    pos === "centre back" ||
    pos === "cb" ||
    pos === "lb" ||
    pos === "rb" ||
    pos === "full back" ||
    pos === "wing back"
  );
};

export const getEligibleCleanSheetPlayersForTeam = async (
  matchId: Types.ObjectId | string,
  teamId: Types.ObjectId | string
): Promise<Array<{ _id: Types.ObjectId; name: string; position: string }>> => {
  const matchObjId = new Types.ObjectId(matchId.toString());
  const teamObjId = new Types.ObjectId(teamId.toString());

  // 1. Check if MatchPlayerSelection exists for this match & team
  const selection = await MatchPlayerSelection.findOne({
    match: matchObjId,
    team: teamObjId,
  }).lean();

  if (selection && Array.isArray(selection.players) && selection.players.length > 0) {
    const candidatePlayerIds = selection.players.map((p: any) => p.player);
    const users = await User.find({ _id: { $in: candidatePlayerIds } }).select("_id firstName lastName position").lean();
    const userMap = new Map<string, any>();
    users.forEach((u: any) => userMap.set(u._id.toString(), u));

    const eligible: Array<{ _id: Types.ObjectId; name: string; position: string }> = [];

    for (const p of selection.players) {
      const u = userMap.get(p.player.toString());
      const selectedPos = p.position || "";
      const userPos = u?.position || "";

      if (isGKOrDefender(selectedPos) || isGKOrDefender(userPos)) {
        eligible.push({
          _id: p.player,
          name: u ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : "Player",
          position: selectedPos || userPos || "Defender",
        });
      }
    }

    if (eligible.length > 0) {
      return eligible;
    }
  }

  // 2. Fallback: Check all registered players of the team
  const teamPlayers = await User.find({
    selectTeam: teamObjId,
    position: { $exists: true, $ne: null },
  })
    .select("_id firstName lastName position")
    .lean();

  return teamPlayers
    .filter((u: any) => isGKOrDefender(u.position))
    .map((u: any) => ({
      _id: u._id,
      name: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
      position: u.position,
    }));
};

/**
 * Automatically evaluates a finished match and awards clean sheets to eligible
 * goalkeepers and defenders for any team that conceded 0 goals.
 */
export const awardMatchCleanSheets = async (
  matchId: Types.ObjectId | string
): Promise<{ awardedCount: number; recipients: string[] }> => {
  const match = await Match.findById(matchId);
  if (!match) {
    return { awardedCount: 0, recipients: [] };
  }

  const homeScore = Number(match.homeScore) || 0;
  const awayScore = Number(match.awayScore) || 0;

  const cleanSheetTeams: Array<{
    teamId: Types.ObjectId;
    opponentName: string;
    conceded: number;
  }> = [];

  const homeTeam = await Team.findById(match.homeTeam).select("teamName").lean();
  const awayTeam = await Team.findById(match.awayTeam).select("teamName").lean();
  const homeName = homeTeam?.teamName || "Home Team";
  const awayName = awayTeam?.teamName || "Away Team";

  // Home Team kept clean sheet if Away scored 0
  if (awayScore === 0 && match.homeTeam) {
    cleanSheetTeams.push({
      teamId: match.homeTeam,
      opponentName: awayName,
      conceded: awayScore,
    });
  }

  // Away Team kept clean sheet if Home scored 0
  if (homeScore === 0 && match.awayTeam) {
    cleanSheetTeams.push({
      teamId: match.awayTeam,
      opponentName: homeName,
      conceded: homeScore,
    });
  }

  if (cleanSheetTeams.length === 0) {
    return { awardedCount: 0, recipients: [] };
  }

  const pe = await PlayerEconomy.findOne();
  const csCoin = Number(pe?.cleanSheet?.coin) || 2000;
  const minute = match.elapsedSeconds
    ? Math.floor(match.elapsedSeconds / 60)
    : Number(match.durationMinutes) || 90;

  let awardedCount = 0;
  const recipients: string[] = [];

  for (const csTeam of cleanSheetTeams) {
    const eligiblePlayers = await getEligibleCleanSheetPlayersForTeam(
      match._id,
      csTeam.teamId
    );

    for (const player of eligiblePlayers) {
      // Idempotency: Do not duplicate if clean sheet already awarded for this match & player
      const alreadyAwarded = await MatchResult.findOne({
        match: match._id,
        player: player._id,
        eventType: "clean_sheet",
      });

      if (alreadyAwarded) {
        continue;
      }

      // 1. Create MatchResult clean_sheet event
      await MatchResult.create({
        match: match._id,
        team: csTeam.teamId,
        player: player._id,
        eventType: "clean_sheet",
        minute,
        league: match.league || undefined,
      });

      // 2. Increment PlayerStats cleanSheets
      if (match.league) {
        await PlayerStats.findOneAndUpdate(
          { player: player._id, league: match.league, team: csTeam.teamId },
          { $inc: { cleanSheets: 1 } },
          { upsert: true, new: true }
        );
      }

      // 3. Award Pro coins and create CoinTransaction ledger record
      const isPro = await isUserPremiumPlayer(player._id);
      if (isPro && csCoin > 0) {
        await recordCoinTransaction({
          userId: player._id,
          amount: csCoin,
          category: COIN_TRANSACTION_CATEGORY.CLEAN_SHEET,
          title: "Clean Sheet Reward",
          description: `Auto-awarded clean sheet against ${csTeam.opponentName} in match: ${homeName} vs ${awayName}`,
          matchId: match._id,
          referenceId: match._id.toString(),
        });
      }

      awardedCount++;
      recipients.push(`${player.name} (${player.position})`);
    }
  }

  return { awardedCount, recipients };
};

/**
 * Revokes clean sheets awarded for a match (or for a specific team in the match).
 * Used when a match score is modified away from 0, match is cancelled, or rolled back.
 */
export const revokeMatchCleanSheets = async (
  matchId: Types.ObjectId | string,
  teamId?: Types.ObjectId | string
): Promise<{ revokedCount: number }> => {
  const query: any = {
    match: matchId,
    eventType: "clean_sheet",
  };
  if (teamId) {
    query.team = teamId;
  }

  const existingCleanSheets = await MatchResult.find(query);
  if (!existingCleanSheets || existingCleanSheets.length === 0) {
    return { revokedCount: 0 };
  }

  const pe = await PlayerEconomy.findOne();
  const csCoin = Number(pe?.cleanSheet?.coin) || 2000;

  for (const cs of existingCleanSheets) {
    // 1. Decrement PlayerStats
    if (cs.league) {
      await PlayerStats.findOneAndUpdate(
        { player: cs.player, league: cs.league, team: cs.team },
        { $inc: { cleanSheets: -1 } }
      );
    }

    // 2. Rollback coins if Pro player
    if (cs.player) {
      const isPro = await isUserPremiumPlayer(cs.player);
      if (isPro && csCoin > 0) {
        await recordCoinTransaction({
          userId: cs.player,
          amount: -csCoin,
          category: COIN_TRANSACTION_CATEGORY.ROLLBACK,
          title: "Clean Sheet Revoked",
          description: `Clean sheet revoked due to match score adjustment or status change`,
          matchId: cs.match ? cs.match : undefined,
          referenceId: cs.match ? cs.match.toString() : undefined,
        });
      }
    }

    // 3. Delete MatchResult record
    await MatchResult.findByIdAndDelete(cs._id);
  }

  return { revokedCount: existingCleanSheets.length };
};

/**
 * Manual override for Admins: Award a clean sheet to a specific player in a match.
 */
export const manualAwardCleanSheet = async (
  matchId: string,
  playerId: string,
  adminId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> => {
  const match = await Match.findById(matchId);
  if (!match) throw new Error("Match not found");

  const player = await User.findById(playerId);
  if (!player) throw new Error("Player not found");

  const teamId = player.selectTeam || match.homeTeam;

  const alreadyAwarded = await MatchResult.findOne({
    match: match._id,
    player: player._id,
    eventType: "clean_sheet",
  });
  if (alreadyAwarded) {
    return { success: false, message: "Clean sheet already awarded to this player for this match" };
  }

  const pe = await PlayerEconomy.findOne();
  const csCoin = Number(pe?.cleanSheet?.coin) || 2000;
  const minute = match.elapsedSeconds ? Math.floor(match.elapsedSeconds / 60) : 90;

  await MatchResult.create({
    match: match._id,
    team: teamId,
    player: player._id,
    eventType: "clean_sheet",
    minute,
    league: match.league || undefined,
  });

  if (match.league) {
    await PlayerStats.findOneAndUpdate(
      { player: player._id, league: match.league, team: teamId },
      { $inc: { cleanSheets: 1 } },
      { upsert: true, new: true }
    );
  }

  const isPro = await isUserPremiumPlayer(player._id);
  if (isPro && csCoin > 0) {
    await recordCoinTransaction({
      userId: player._id,
      amount: csCoin,
      category: COIN_TRANSACTION_CATEGORY.CLEAN_SHEET,
      title: "Clean Sheet Reward (Admin Manual)",
      description: reason || `Clean sheet manually awarded by admin for match ${match._id}`,
      matchId: match._id,
      referenceId: match._id.toString(),
      createdBy: adminId,
    });
  }

  return { success: true, message: "Clean sheet awarded successfully" };
};

/**
 * Manual override for Admins: Revoke a clean sheet from a specific player in a match.
 */
export const manualRevokeCleanSheet = async (
  matchId: string,
  playerId: string,
  adminId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> => {
  const cs = await MatchResult.findOne({
    match: matchId,
    player: playerId,
    eventType: "clean_sheet",
  });

  if (!cs) {
    return { success: false, message: "No clean sheet record found for this player in this match" };
  }

  const pe = await PlayerEconomy.findOne();
  const csCoin = Number(pe?.cleanSheet?.coin) || 2000;

  if (cs.league) {
    await PlayerStats.findOneAndUpdate(
      { player: cs.player, league: cs.league, team: cs.team },
      { $inc: { cleanSheets: -1 } }
    );
  }

  if (cs.player) {
    const isPro = await isUserPremiumPlayer(cs.player);
    if (isPro && csCoin > 0) {
      await recordCoinTransaction({
        userId: cs.player,
        amount: -csCoin,
        category: COIN_TRANSACTION_CATEGORY.ROLLBACK,
        title: "Clean Sheet Revoked (Admin Manual)",
        description: reason || `Clean sheet manually revoked by admin for match ${matchId}`,
        matchId: cs.match ? cs.match : undefined,
        referenceId: cs.match ? cs.match.toString() : undefined,
        createdBy: adminId,
      });
    }
  }

  await MatchResult.findByIdAndDelete(cs._id);

  return { success: true, message: "Clean sheet revoked successfully" };
};

import { Types } from "mongoose";
import { Match } from "../app/modules/match/match.model";
import { MatchPlayerSelection } from "../app/modules/matchPlayerSelection/matchPlayerSelection.model";
import { MatchResult } from "../app/modules/matchResult/matchResult.model";
import { PlayerEconomy } from "../app/modules/coinAndBudget/playerEconomySchema.model";
import { CoinTransaction } from "../app/modules/coinTransaction/coinTransaction.model";
import { COIN_TRANSACTION_CATEGORY } from "../app/modules/coinTransaction/coinTransaction.interface";
import { PlayerStats } from "../app/modules/playerStats/playerStats.model";
import { User } from "../app/modules/user/user.model";
import { isUserPremiumPlayer } from "./packageHelper";
import { recordCoinTransaction } from "./coinLedgerHelper";

/**
 * Automatically evaluates a finished match and awards "Playing a Match" coins
 * to all eligible participating players from MatchPlayerSelection / MatchResult.
 * Every single coin flows strictly through recordCoinTransaction so that complete
 * ledger history is guaranteed.
 */
export const awardMatchPlayerParticipation = async (
  matchId: Types.ObjectId | string
): Promise<{ awardedCount: number; recipients: string[] }> => {
  const match = await Match.findById(matchId)
    .populate("homeTeam", "teamName shortName")
    .populate("awayTeam", "teamName shortName")
    .lean();

  if (!match) {
    return { awardedCount: 0, recipients: [] };
  }

  const pe = await PlayerEconomy.findOne().lean();
  const playCoin = Number(pe?.playingMatch?.coin) || 500;

  if (playCoin <= 0) {
    return { awardedCount: 0, recipients: [] };
  }

  const hName =
    (match.homeTeam as any)?.teamName ||
    (match.homeTeam as any)?.shortName ||
    "Home";
  const aName =
    (match.awayTeam as any)?.teamName ||
    (match.awayTeam as any)?.shortName ||
    "Away";
  const fixtureStr = `${hName} vs ${aName}`;

  // 1. Gather all players from lineup / selection for this match
  const candidatePlayerIds = new Set<string>();

  const selections = await MatchPlayerSelection.find({ match: match._id }).lean();
  for (const sel of selections) {
    if (Array.isArray(sel.players)) {
      for (const p of sel.players) {
        if (p.player) {
          candidatePlayerIds.add(p.player.toString());
        }
      }
    }
  }

  // 2. Also include any players that have match events (e.g., goals, assists, cards)
  const results = await MatchResult.find({ match: match._id })
    .select("player")
    .lean();
  for (const r of results) {
    if (r.player) {
      candidatePlayerIds.add(r.player.toString());
    }
  }

  // 3. Fallback: if no player selection was submitted for either team, include team registered players
  if (candidatePlayerIds.size === 0) {
    const teamIds: any[] = [];
    if (match.homeTeam) teamIds.push((match.homeTeam as any)._id || match.homeTeam);
    if (match.awayTeam) teamIds.push((match.awayTeam as any)._id || match.awayTeam);

    if (teamIds.length > 0) {
      const teamPlayers = await User.find({
        selectTeam: { $in: teamIds },
        role: "PLAYER",
      })
        .select("_id")
        .lean();

      for (const tp of teamPlayers) {
        candidatePlayerIds.add(tp._id.toString());
      }
    }
  }

  let awardedCount = 0;
  const recipients: string[] = [];

  for (const pId of candidatePlayerIds) {
    try {
      // Check if this player was already awarded playing coins for this match to prevent duplicates
      const alreadyAwarded = await CoinTransaction.findOne({
        $or: [
          { referenceId: `${match._id.toString()}_appearance_${pId}` },
          { user: pId, match: match._id, category: COIN_TRANSACTION_CATEGORY.PLAYING_MATCH },
        ],
      }).lean();

      if (alreadyAwarded) {
        continue;
      }

      // Free players do not earn coins in ENG
      const isPro = await isUserPremiumPlayer(pId);
      if (!isPro) {
        continue;
      }

      // Record coin credit strictly through ledger helper
      await recordCoinTransaction({
        userId: pId,
        amount: playCoin,
        category: COIN_TRANSACTION_CATEGORY.PLAYING_MATCH,
        title: "Match Appearance Bonus",
        description: `Participated in match: ${fixtureStr}`,
        matchId: match._id,
        referenceId: `${match._id.toString()}_appearance_${pId}`,
      });

      // Increment matchesPlayed stats
      if (match.league) {
        await PlayerStats.findOneAndUpdate(
          { player: pId, league: match.league },
          { $inc: { matchesPlayed: 1, totalMatches: 1 } },
          { upsert: false }
        );
      }

      awardedCount++;
      recipients.push(pId);
    } catch (playerErr) {
      console.error(
        `Failed to award match playing coins to player ${pId}:`,
        playerErr
      );
    }
  }

  return { awardedCount, recipients };
};

/**
 * Rollback playing match coins if a match is cancelled or reset from finished status.
 * Reversal is recorded strictly as a compensating transaction in the ledger.
 */
export const revokeMatchPlayerParticipation = async (
  matchId: Types.ObjectId | string
): Promise<{ revokedCount: number }> => {
  const existingTxs = await CoinTransaction.find({
    match: matchId,
    category: COIN_TRANSACTION_CATEGORY.PLAYING_MATCH,
  }).lean();

  if (!existingTxs || existingTxs.length === 0) {
    return { revokedCount: 0 };
  }

  const pe = await PlayerEconomy.findOne().lean();
  const playCoin = Number(pe?.playingMatch?.coin) || 500;
  const matchDoc = await Match.findById(matchId).select("league").lean();

  for (const tx of existingTxs) {
    try {
      if (tx.user) {
        const isPro = await isUserPremiumPlayer(tx.user.toString());
        if (isPro && playCoin > 0) {
          await recordCoinTransaction({
            userId: tx.user,
            amount: -playCoin,
            category: COIN_TRANSACTION_CATEGORY.ROLLBACK,
            title: "Match Appearance Revoked",
            description: `Match appearance bonus revoked due to match reset or cancellation`,
            matchId: matchId,
            referenceId: `${matchId.toString()}_appearance_revoke_${tx.user.toString()}`,
          });
        }

        if (matchDoc?.league) {
          await PlayerStats.findOneAndUpdate(
            { player: tx.user, league: matchDoc.league },
            { $inc: { matchesPlayed: -1, totalMatches: -1 } }
          );
        }
      }

      // Remove the original PLAYING_MATCH transaction so it could be re-awarded if match is re-finished
      await CoinTransaction.findByIdAndDelete(tx._id);
    } catch (err) {
      console.error(`Error revoking playing match coins for ${tx.user}:`, err);
    }
  }

  return { revokedCount: existingTxs.length };
};

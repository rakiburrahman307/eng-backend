import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { MatchResultService } from "../matchResult/matchResult.service";
import { StatisticService } from "./statistic.service";



const getTopPlayer = catchAsync(async (req: Request, res: Response) => {
  const { leagueId } = req.params;

  const result = await StatisticService.getTopPlayerFromDB(leagueId as string);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Top player fetched successfully",
    data: result,
  });
});

const getPlayerSeasonStats = catchAsync(
  async (req: Request, res: Response) => {
    const { playerId, leagueId } = req.params;

    const result = await StatisticService.getPlayerSeasonStatsFromDB(
      playerId as string,
      leagueId as string
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Player season stats fetched successfully",
      data: result,
    });
  }
);



const getLeagueSummary = catchAsync(async (req: Request, res: Response) => {
  const result = await StatisticService.getLeagueSummaryFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "League statistics fetched successfully",
    data: result,
  });
});


const getSeasonLeaderboard = catchAsync(
  async (req: Request, res: Response) => {
    const { season } = req.query;

    const result = await StatisticService.getSeasonLeaderboardFromDB(
      season as string
    );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: "Season leaderboard fetched successfully",
      data: result,
    });
  }
);



export const StatisticController = {
  getTopPlayer,
  getPlayerSeasonStats,
  getLeagueSummary,
  getSeasonLeaderboard
};
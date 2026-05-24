import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { LeagueTeamService } from './leagueTeam.service';

// ADD TEAM
const addTeamToLeague = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await LeagueTeamService.addTeamToLeagueToDB(
        req.body
      );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Team added to league successfully',
      data: result,
    });
  }
);

// GET ALL
const getLeagueTeams = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await LeagueTeamService.getLeagueTeamsFromDB(
        req.query
      );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'League teams retrieved successfully',
      data: result,
    });
  }
);

// REMOVE
const removeTeamFromLeague = catchAsync(
  async (req: Request, res: Response) => {
    const result =
      await LeagueTeamService.removeTeamFromLeagueToDB(
        req.params.id as string,
      );

    sendResponse(res, {
      success: true,
      statusCode: StatusCodes.OK,
      message: 'Team removed from league successfully',
      data: result,
    });
  }
);


// GET teams of a league
const getTeamsByLeague = catchAsync(async (req, res) => {
  const result = await LeagueTeamService.getTeamsByLeagueFromDB(
    req.params.leagueId as string
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'League teams retrieved successfully',
    data: result,
  });
});



// REMOVE single team
const removeSingleTeamFromLeague = catchAsync(async (req, res) => {
  const result = await LeagueTeamService.removeSingleTeamFromLeague(
    req.params.leagueId as string,
    req.params.teamId as string
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Team removed from league successfully',
    data: result,
  });
});


const getAllLeagueWithTeams = catchAsync(async (req, res) => {
  console.log("========== GET ALL LEAGUE TEAMS ==========");

  const result = await LeagueTeamService.getAllLeagueWithTeamsFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "All leagues with teams retrieved successfully",
    data: result,
  });
});


export const LeagueTeamController = {
  addTeamToLeague,
  getLeagueTeams,
  removeTeamFromLeague,
  getTeamsByLeague,
    removeSingleTeamFromLeague,
  getAllLeagueWithTeams
};
import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { PlayerService } from "./player.service";


// GET ALL PLAYERS
const getAllPlayers = catchAsync(async (req: Request, res: Response) => {
  const result = await PlayerService.getAllPlayersFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Players retrieved successfully",
    data: result,
  });
});


// ✅ GET FILTERED PLAYERS BY TEAM AND/OR POSITION
const getFilteredPlayers = catchAsync(async (req: Request, res: Response) => {
  const result = await PlayerService.getFilteredPlayersFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Filtered players retrieved successfully",
    data: result,
  });
});


export const PlayerController = {
  getAllPlayers,
  getFilteredPlayers,
};


import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { PlayerService } from "./player.service";


// GET PLAYER DASHBOARD
const getAllPlayers = catchAsync(async (req: Request, res: Response) => {
  const result = await PlayerService.getAllPlayersFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Players retrieved successfully",
    data: result,
  });
});

export const PlayerController = {
  getAllPlayers,
};


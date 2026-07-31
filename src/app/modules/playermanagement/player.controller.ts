import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { PlayerService } from "./player.service";

// GET ALL PLAYERS
const getAllPlayers = catchAsync(async (req: Request, res: Response) => {
  const result = await PlayerService.getAllPlayersFromDB(req.query, req.user);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Players retrieved successfully",
    data: result,
  });
});

// ✅ GET FILTERED PLAYERS BY TEAM AND/OR POSITION
const getFilteredPlayers = catchAsync(async (req: Request, res: Response) => {
  const result = await PlayerService.getFilteredPlayersFromDB(req.query, req.user);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Filtered players retrieved successfully",
    data: result,
  });
});

// ✅ UPDATE PLAYER BY ADMIN
const updatePlayerByAdmin = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const files = req.files as {
    image?: Express.Multer.File[];
  };

  const image = files?.image?.[0];
  const data = req.body?.data ? JSON.parse(req.body.data) : req.body || {};
  const payload: any = { ...data };

  if (image) {
    payload.profile = image.path
      .replace(/\\/g, "/")
      .split("uploads")[1];
  }

  const result = await PlayerService.updatePlayerByAdminToDB(id, payload);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Player updated successfully",
    data: result,
  });
});

export const PlayerController = {
  getAllPlayers,
  getFilteredPlayers,
  updatePlayerByAdmin,
};

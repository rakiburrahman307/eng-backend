import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { MatchPlayerSelectionService } from "./matchPlayerSelection.service";

// CREATE
const createSelection = catchAsync(async (req: Request, res: Response) => {
  const result = await MatchPlayerSelectionService.createSelectionIntoDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.CREATED,
    message: "Players selected successfully",
    data: result,
  });
});

// GET ALL
const getAllSelections = catchAsync(async (req: Request, res: Response) => {
  const result = await MatchPlayerSelectionService.getAllSelectionsFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "All selections fetched",
    data: result,
  });
});

// GET SINGLE
const getSingleSelection = catchAsync(async (req: Request, res: Response) => {
  const result = await MatchPlayerSelectionService.getSingleSelectionFromDB(
    req.params.id as string
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Selection fetched",
    data: result,
  });
});

// UPDATE
const updateSelection = catchAsync(async (req: Request, res: Response) => {
  const result = await MatchPlayerSelectionService.updateSelectionIntoDB(
    req.params.id as string,
    req.body
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Selection updated",
    data: result,
  });
});

// DELETE
const deleteSelection = catchAsync(async (req: Request, res: Response) => {
  const result = await MatchPlayerSelectionService.deleteSelectionFromDB(
    req.params.id as string
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Selection deleted",
    data: result,
  });
});



const getPlayersByMatchAndTeam = catchAsync(async (req: Request, res: Response) => {
  const { matchId, teamId } = req.query;

  const result =
    await MatchPlayerSelectionService.getPlayersByMatchAndTeamFromDB(
      matchId as string,
      teamId as string
    );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Players fetched successfully by match and team",
    data: result,
  });
});



export const MatchPlayerSelectionController = {
  createSelection,
  getAllSelections,
  getSingleSelection,
  updateSelection,
    deleteSelection,
  getPlayersByMatchAndTeam
};
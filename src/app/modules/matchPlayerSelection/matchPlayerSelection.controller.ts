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
    message: "Player selected for match successfully",
    data: result,
  });
});

// GET
const getSelections = catchAsync(async (req: Request, res: Response) => {
  const result = await MatchPlayerSelectionService.getSelectionsFromDB(
    req.params.matchId as string
  );

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "Match selections retrieved successfully",
    data: result,
  });
});

// UPDATE
// GET ALL
const getAllSelections = catchAsync(async (req: Request, res: Response) => {
  const result = await MatchPlayerSelectionService.getAllSelectionsFromDB();

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: "All selections retrieved successfully",
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
    message: "Selection retrieved successfully",
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
    message: "Selection deleted successfully",
    data: result,
  });
});


export const MatchPlayerSelectionController = {
  createSelection,
  getSelections,
  getAllSelections,
  getSingleSelection,
  deleteSelection
};
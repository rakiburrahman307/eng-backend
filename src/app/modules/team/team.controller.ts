import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { TeamService } from './team.service';

// CREATE
const createTeam = catchAsync(async (req: Request, res: Response) => {

  // 📂 FULL FILES CHECK
  const files = req.files as {
    image?: Express.Multer.File[];
  };

  // 🖼️ LOGO CHECK
  const logo = files?.image?.[0];
  // 📦 RAW BODY
  // 📦 JSON PARSE
  let data = {};

  if (req.body?.data) {
    try {
      data = JSON.parse(req.body.data);
    } catch (error) {
      console.error("❌ JSON Parse Error:", error);
    }
  } else {
    console.log("⚠️ No req.body.data found");
  }

  // 🚀 FINAL PAYLOAD
  const payload: any = {
    ...data,
  };


  // 🖼️ LOGO ATTACH
  if (logo) {
    payload.teamLogo  = logo.path
      .replace(/\\/g, '/')
      .split('uploads')[1];
  } else {
    console.log("⚠️ No logo uploaded");
  }


  // 🧠 DB CALL
  const result = await TeamService.createTeamToDB(payload);


  // 📤 RESPONSE
  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Team created successfully',
    data: result,
  });
});

// GET ALL
const getAllTeams = catchAsync(async (req: Request, res: Response) => {
  const result = await TeamService.getAllTeamsFromDB(req.query);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Teams retrieved successfully',
    pagination: result.meta,
    data: result.result,
  });
});

// SINGLE
const getSingleTeam = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const result = await TeamService.getSingleTeamFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Team retrieved successfully',
    data: result,
  });
});

// UPDATE
const updateTeam = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  // 📂 FILES
  const files = req.files as {
    image?: Express.Multer.File[];
  };

  const logo = files?.image?.[0];

  // 📦 BODY PARSE (same as create)
  let data = {};

  if (req.body?.data) {
    try {
      data = JSON.parse(req.body.data);
    } catch (error) {
      console.error("❌ JSON Parse Error:", error);
    }
  } else {
    data = req.body; // fallback for normal JSON request
  }

  // 🚀 FINAL PAYLOAD
  const payload: any = {
    ...data,
  };

  // 🖼️ LOGO UPDATE
  if (logo) {
    payload.teamLogo = logo.path
      .replace(/\\/g, '/')
      .split('uploads')[1];
  }

  const result = await TeamService.updateTeamToDB(id, payload);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Team updated successfully',
    data: result,
  });
});

// DELETE
const deleteTeam = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;

  const result = await TeamService.deleteTeamFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: StatusCodes.OK,
    message: 'Team deleted successfully',
    data: result,
  });
});

export const TeamController = {
  createTeam,
  getAllTeams,
  getSingleTeam,
  updateTeam,
  deleteTeam,
};
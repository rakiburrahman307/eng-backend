import e, { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { ReservationService } from "./reservation.service";
import sendResponse from "../../../shared/sendResponse";
import { StatusCodes } from "http-status-codes";

const createReservation = catchAsync(async (req: Request, res: Response) => {
    const reservation = await ReservationService.createReservationToDB(req.body);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reservation created successfully",
        data: reservation
    })
}); 

const barberReservation = catchAsync(async (req: Request, res: Response) => {
    const reservation = await ReservationService.barberReservationFromDB(req.user, req.query.status as string);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reservation created successfully",
        data: reservation
    })
}); 

const customerReservation = catchAsync(async (req: Request, res: Response) => {
    const reservation = await ReservationService.customerReservationFromDB(req.user, req.query.status as string);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reservation created successfully",
        data: reservation
    })
}); 


const reservationSummerForBarber = catchAsync(async (req: Request, res: Response) => {
    const reservation = await ReservationService.reservationSummerForBarberFromDB(req.user);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reservation created successfully",
        data: reservation
    })
}); 

const reservationDetails = catchAsync(async (req: Request, res: Response) => {

    const reservation = await ReservationService.reservationDetailsFromDB(req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reservation Details retrieved successfully",
        data: reservation
    })
}); 

const respondedReservation = catchAsync(async (req: Request, res: Response) => {

    const reservation = await ReservationService.respondedReservationFromDB(req.params.id, req.query.status as string);
    sendResponse(res, {
        statusCode: StatusCodes.OK,
        success: true,
        message: "Reservation Updated  successfully",
        data: reservation
    })
}); 

export const ReservationController = {
    createReservation,
    barberReservation,
    customerReservation,
    reservationSummerForBarber,
    reservationDetails,
    respondedReservation
}
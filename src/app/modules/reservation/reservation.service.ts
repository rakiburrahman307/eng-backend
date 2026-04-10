import { JwtPayload } from "jsonwebtoken";
import { IReservation } from "./reservation.interface";
import { Reservation } from "./reservation.model";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import { Report } from "../report/report.model";
import mongoose from "mongoose";
import { sendNotifications } from "../../../helpers/notificationsHelper";

const createReservationToDB = async (payload: IReservation): Promise<IReservation> => {
    const reservation = await Reservation.create(payload);
    if (!reservation) {
        throw new Error('Failed to created Reservation ');
    } else{
        const data = {
            text: "Your reservation has been rejected. Try another Barber",
            receiver: payload.barber,
            referenceId: reservation._id,
            screen: "RESERVATION"
        }

        sendNotifications(data);
    }

    return reservation;
};

const barberReservationFromDB = async (user: JwtPayload, status: string): Promise<{}> => {

    const condition: any = {
        barber: user.id
    }

    if (status) {
        condition['status'] = status;
    }

    const reservation = await Reservation.find(condition)
        .populate([
            {
                path: 'customer',
                select: "name"
            },
            {
                path: 'service',
                select: "title category ",
                populate: [
                    {
                        path: "title",
                        select: "title"
                    },
                    {
                        path: "category",
                        select: "name"
                    },
                ]
            }
        ])
        .select("customer service createdAt status price");

    // check how many reservation in each status
    const allStatus = await Promise.all(["Upcoming", "Accepted", "Canceled", "Completed"].map(
        async (status: string) => {
            return {
                status,
                count: await Reservation.countDocuments({ barber: user.id, status })
            }
        }));


    return { allStatus, reservation };
}

const customerReservationFromDB = async (user: JwtPayload, status: string): Promise<IReservation[]> => {

    const condition: any = {
        customer: user.id
    }

    if (status) {
        condition['status'] = status;
    }

    const reservation = await Reservation.find(condition)
        .populate([
            {
                path: 'barber',
                select: "name"
            },
            {
                path: 'service',
                select: "title category rating totalRating",
                populate: [
                    {
                        path: "title",
                        select: "title"
                    },
                    {
                        path: "category",
                        select: "name"
                    },
                ]
            }
        ])
        .select("barber service createdAt status price");


    if (!reservation) throw [];
    return reservation;
}

const reservationSummerForBarberFromDB = async (user: JwtPayload): Promise<{}> => {

    // total earnings
    const totalEarnings = await Reservation.aggregate([
        {
            $match: { barber: user.id }
        },
        {
            $group: {
                _id: null,
                totalEarnings: { $sum: "$price" }
            }
        }
    ]);

    // total earnings today
    const today = new Date();
    const todayEarnings = await Reservation.aggregate([
        {
            $match: { barber: user.id, createdAt: { $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) } }
        },
        {
            $group: {
                _id: null,
                todayEarnings: { $sum: "$price" }
            }
        }
    ]);

    // total reservations today
    const todayReservations = await Reservation.countDocuments(
        {
            barber: user.id,
            createdAt: { $gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) }
        } as any);

    // total reservations
    const totalReservations = await Reservation.countDocuments({ barber: user.id } as any);

    const data = {
        earnings: {
            total: totalEarnings[0]?.totalEarnings || 0,
            today: todayEarnings[0]?.todayEarnings || 0,
        },
        services: {
            today: todayReservations,
            total: totalReservations
        }
    }

    return data;
}


const reservationDetailsFromDB = async (id: string): Promise<{ reservation: IReservation | null, report: any }> => {

    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Reservation ID');

    const reservation: IReservation | null = await Reservation.findById(id)
        .populate([
            {
                path: 'customer',
                select: "name profile location"
            },
            {
                path: 'service',
                select: "title category"
            }
        ])
        .select("customer service createdAt status price");

    if (!reservation) throw new ApiError(StatusCodes.NOT_FOUND, 'Reservation not found');

    const report = await Report.findOne({ reservation: id }).select("reason");

    return { reservation, report, };
}


const respondedReservationFromDB = async (id: string, status: string): Promise<IReservation | null> => {

    if (!mongoose.Types.ObjectId.isValid(id)) throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid Reservation ID');

    const updatedReservation = await Reservation.findOneAndUpdate(
        { _id: id },
        { status },
        { new: true }
    );
    if (!updatedReservation) throw new ApiError(StatusCodes.NOT_FOUND, 'Failed to update reservation');

    if (updatedReservation?.status === "Rejected") {
        const data = {
            text: "Your reservation has been rejected. Try another Barber",
            receiver: updatedReservation.customer,
            referenceId: id,
            screen: "RESERVATION"
        }

        sendNotifications(data);
    }

    if (updatedReservation?.status === "Accepted") {
        const data = {
            text: "Your reservation has been Accepted. Your service will start soon",
            receiver: updatedReservation.customer,
            referenceId: id,
            screen: "RESERVATION"
        }

        sendNotifications(data);
    }

    if (updatedReservation?.status === "Canceled") {
        const data = {
            text: "Your reservation cancel request has been Accepted.",
            receiver: updatedReservation.customer,
            referenceId: id,
            screen: "RESERVATION"
        }

        sendNotifications(data);
    }
    
    return updatedReservation;
}


export const ReservationService = {
    createReservationToDB,
    barberReservationFromDB,
    customerReservationFromDB,
    reservationSummerForBarberFromDB,
    reservationDetailsFromDB,
    respondedReservationFromDB
}
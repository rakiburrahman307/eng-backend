import { model, Schema } from "mongoose";
import { IReport, ReportModel } from "./report.interface";
import ApiError from "../../../errors/ApiError";
import { StatusCodes } from "http-status-codes";
import { Reservation } from "../reservation/reservation.model";

const reportSchema = new Schema<IReport, ReportModel>(
    {
        customer: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "User"
        },
        barber: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "User"
        },
        reservation: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: "Reservation"
        },
        reason: [
            {
                type: String,
                required: true
            }
        ]
    },
    { timestamps: true }
);


//check user
reportSchema.pre('save', async function (next) {

    const report = this as IReport;

    const updatedReservation = await Reservation.findOneAndUpdate(
        { _id: report.reservation },
        { isReported: true },
        { new: true }
    );

    if (!updatedReservation) {
        return next(new ApiError(StatusCodes.BAD_REQUEST, 'Reservation Not Found'));
    }

    next();
});


export const Report = model<IReport, ReportModel>("Report", reportSchema);
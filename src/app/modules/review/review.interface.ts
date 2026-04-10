import { Model, Types } from "mongoose";

export type IReview = {
    customer: Types.ObjectId;
    barber: Types.ObjectId;
    service: Types.ObjectId;
    comment: string;
    rating: number;
}

export type ReviewModel = Model<IReview>;
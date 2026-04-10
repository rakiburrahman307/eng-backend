import { model, Schema } from "mongoose";
import { IPackage, PackageModel } from "./package.interface";

const packageSchema = new Schema<IPackage, PackageModel>(
    {
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        duration: {
            type: String,
            enum: ['1 month' , '3 months' , '6 months' , '1 year'],
            required: true
        },
        paymentType: {
            type: String,
            enum: ['Monthly' , 'Yearly'],
            required: true
        },
        productId: {
            type: String,
            required: true
        },
        credit: {
            type: Number,
            required: true
        },
        loginLimit: {
            type: Number,
            required: true
        },
        paymentLink: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['Active', 'Delete'],
            default: "Active"
        }
    },
    {
        timestamps: true
    }
)

export const Package = model<IPackage, PackageModel>("Package", packageSchema)
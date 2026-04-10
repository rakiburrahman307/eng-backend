import { Model } from "mongoose";

export type IBanner = {
    name: string;
    image: string;
}

export type BannerModel = Model<IBanner>;
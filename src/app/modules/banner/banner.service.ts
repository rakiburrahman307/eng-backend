import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import { IBanner } from "./banner.interface";
import { Banner } from "./banner.model";
import unlinkFile from "../../../shared/unlinkFile";
import mongoose from "mongoose";

const createBannerToDB = async (payload:IBanner): Promise<IBanner> => {

  const createBanner:any = await Banner.create(payload);
  if (!createBanner) {
    unlinkFile(payload.image)
    throw new ApiError(StatusCodes.OK, "Failed to created banner");
  }

  return createBanner;
};

const getAllBannerFromDB = async (): Promise<IBanner[]>=> {
  return await Banner.find({});
};

const updateBannerToDB = async (id: string, payload:IBanner): Promise<IBanner | {}> => {

  if(!mongoose.Types.ObjectId.isValid(id)){
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ")
  }

  const isBannerExist:any = await Banner.findById(id);

  if (payload.image) {
    unlinkFile(isBannerExist?.image);
  }

  const banner:any = await Banner.findOneAndUpdate({ _id: id }, payload, {new: true});
  return banner;
};

const deleteBannerToDB = async (id: string): Promise<IBanner | undefined> => {

  if(!mongoose.Types.ObjectId.isValid(id)){
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "Invalid ")
  }

  const isBannerExist:any = await Banner.findById({_id: id});

  //delete from folder
  if(isBannerExist){
    unlinkFile(isBannerExist?.image);
  }

  //delete from database
  await Banner.findByIdAndDelete(id);
  return; 
};

export const BannerService = {
  createBannerToDB, 
  getAllBannerFromDB, 
  updateBannerToDB, 
  deleteBannerToDB
}
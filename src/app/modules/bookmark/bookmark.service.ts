import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiErrors";
import { IBookmark } from "./bookmark.interface";
import { Bookmark } from "./bookmark.model";
import { JwtPayload } from "jsonwebtoken";

const toggleBookmark = async (payload: {user: JwtPayload, service: string}): Promise<string> => {

     // Check if the bookmark already exists
     const existingBookmark = await Bookmark.findOne({
        user: payload.user,
        service: payload.service
    });

    if (existingBookmark) {
        // If the bookmark exists, delete it
        await Bookmark.findByIdAndDelete(existingBookmark._id);
        return "Bookmark Remove successfully";
    } else {

        // If the bookmark doesn't exist, create it
        const result = await Bookmark.create(payload);
        if (!result) {
            throw new ApiError(StatusCodes.EXPECTATION_FAILED, "Failed to add bookmark");
        }
        return "Bookmark Added successfully";
    }
};


const getBookmark = async (user: JwtPayload): Promise<IBookmark[]>=>{



    const result:any = await Bookmark.find({ user: user?.id })
        .populate({
            path: 'artist',
            model: 'User',
            select: '_id name profile',
            populate:{
                path: 'lesson',
                model: 'Lesson',
                select: 'rating totalRating gallery lessonTitle'
            }
        }).select("artist")
    

    return result?.map((bookmark:any) => {
        const {lesson, ...otherData} = bookmark?.artist?.toObject();

        // Remove the lesson ID field if it exists
        if (lesson?._id) {
            delete lesson?._id;
        }

        return {...otherData, ...lesson, status: true};
    });
}

export const BookmarkService = {toggleBookmark, getBookmark}
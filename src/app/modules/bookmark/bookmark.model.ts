import { model, Schema } from "mongoose";
import { IBookmark, BookmarkModel } from "./bookmark.interface"

const bookmarkSchema = new Schema<IBookmark, BookmarkModel>(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        service: {
            type: Schema.Types.ObjectId,
            ref: "Post",
            required: true
        }
    }, 
    {
        timestamps: true
    }
);

export const Bookmark = model<IBookmark, BookmarkModel>("Bookmark", bookmarkSchema);
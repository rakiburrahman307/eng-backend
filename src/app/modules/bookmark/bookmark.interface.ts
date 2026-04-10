import { Model, Types } from "mongoose";

export type IBookmark= {
    user: Types.ObjectId,
    service: Types.ObjectId
}

export type BookmarkModel = Model<IBookmark>;
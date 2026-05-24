import QueryBuilder from "../../../util/queryBuilder";
import { Notification } from "./pushNotification.model";


const sendNotificationToUsers = async (payload: {
  title: string;
  message: string;
  user?: string; // optional single user
}) => {
  const notification = await Notification.create(payload);


  return notification;
};

const getNotificationsFromDB = async (query: Record<string, any>) => {
  const baseQuery = Notification.find().populate("user", "userName email");

  const queryBuilder = new QueryBuilder(baseQuery, query)
    .search(["title", "message"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await queryBuilder.modelQuery;

  const pagination = await queryBuilder.getPaginationInfo();

  return {
    result,
    pagination,
  };
};


export const NotificationService = {
  sendNotificationToUsers,
  getNotificationsFromDB,
};
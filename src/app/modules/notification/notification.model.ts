import { model, Schema } from 'mongoose';
import { INotification, NotificationModel } from './notification.interface';

const notificationSchema = new Schema<INotification, NotificationModel>(
    {
        text: {
            type: String,
            required: true
        },
        receiver: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        referenceId: {
            type: String,
            required: false
        },
        screen: {
            type: String,
            required: false
        },
        read: {
            type: Boolean,
            default: false
        },
        type: {
            type: String,
            enum: ['ADMIN'],
            required: false
        }
    },
    {
        timestamps: true
    }
);

export const Notification = model<INotification, NotificationModel>(
    'Notification',
    notificationSchema
);

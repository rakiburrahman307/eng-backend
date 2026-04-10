import { Schema, model } from 'mongoose';
import { IMessage, MessageModel } from './message.interface';

const messageSchema = new Schema<IMessage, MessageModel>(
  {
    chatId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Chat',
    },
    sender: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    text: { 
      type: String,
      required: false 
    },
    image: { 
      type: String,
      required: false 
    },
  },
  {
    timestamps: true,
  }
);

export const Message = model<IMessage, MessageModel>('Message', messageSchema);

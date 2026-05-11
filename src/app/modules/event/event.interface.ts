export type IEventStatus = 'draft' | 'publish' | 'schedule';

export interface IEvent {
  title: string;
  description: string;
  image?: string;
  location?: string;
  eventDate: Date;
  publishDateTime?: Date | null;
  status: IEventStatus;
  createdBy: string; // user id
  createdAt?: Date;
  updatedAt?: Date;
}
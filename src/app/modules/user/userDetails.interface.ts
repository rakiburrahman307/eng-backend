import { Types } from "mongoose";

export enum AGE_GROUP {
  U16 = "U16",
  U18 = "U18",
  U21 = "U21",
  SENIOR = "SENIOR",
}

export enum SELECT_GROUP {
  A = "A",
  B = "B",
  C = "C",
}

export type IUserDetails = {
  userId: Types.ObjectId; 
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  strongFoot?: string; // optional
  ageGroup?: AGE_GROUP;
  selectTeam?: Types.ObjectId; // Reference to Team, optional
  position?: string;   // optional
  document?: string[]; // optional
  phone?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  engCoine?: number; // optional
  debutDate?: Date; // optional
};
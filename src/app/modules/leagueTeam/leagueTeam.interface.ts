import { Types } from "mongoose";

/* ---------------- LEAGUE ---------------- */
export interface ILeague {
  _id: Types.ObjectId;
  name: string;
}

/* ---------------- TEAM ---------------- */
export interface ITeam {
  _id: Types.ObjectId;
  teamName: string;
}

/* ---------------- LEAGUE TEAM (RAW DB) ---------------- */
export interface ILeagueTeam {
  league: Types.ObjectId | ILeague;
  team: Types.ObjectId | ITeam;

  createdAt?: Date;
  updatedAt?: Date;
}

/* ---------------- GROUPED RESPONSE ---------------- */
export interface IGroupedLeagueWithTeams {
  league: ILeague;
  teams: ITeam[];
}
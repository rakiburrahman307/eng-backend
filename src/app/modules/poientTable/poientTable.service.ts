import { Match } from '../match/match.model';

const getPointTableFromDB = async () => {
  const matches = await Match.find({ status: 'finished' })
    .populate('homeTeam', 'teamName shortName teamLogo')
    .populate('awayTeam', 'teamName shortName teamLogo');

  const table: any = {};

  for (const match of matches) {
    const home: any = match.homeTeam;
    const away: any = match.awayTeam;

    const homeId = home._id.toString();
    const awayId = away._id.toString();

    // INIT HOME TEAM
    if (!table[homeId]) {
      table[homeId] = {
        team: home,
        played: 0,
        win: 0,
        draw: 0,
        loss: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      };
    }

    // INIT AWAY TEAM
    if (!table[awayId]) {
      table[awayId] = {
        team: away,
        played: 0,
        win: 0,
        draw: 0,
        loss: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
      };
    }

    // PLAYED
    table[homeId].played += 1;
    table[awayId].played += 1;

    // GOALS
    table[homeId].goalsFor += match.homeScore;
    table[homeId].goalsAgainst += match.awayScore;

    table[awayId].goalsFor += match.awayScore;
    table[awayId].goalsAgainst += match.homeScore;

    // GOAL DIFFERENCE
    table[homeId].goalDifference =
      table[homeId].goalsFor - table[homeId].goalsAgainst;

    table[awayId].goalDifference =
      table[awayId].goalsFor - table[awayId].goalsAgainst;

    // RESULT
    if (match.homeScore > match.awayScore) {
      table[homeId].win += 1;
      table[homeId].points += 2;

      table[awayId].loss += 1;
    } 
    else if (match.awayScore > match.homeScore) {
      table[awayId].win += 1;
      table[awayId].points += 2;

      table[homeId].loss += 1;
    } 
    else {
      table[homeId].draw += 1;
      table[awayId].draw += 1;

      table[homeId].points += 1;
      table[awayId].points += 1;
    }
  }

  // SORTING
  const result = Object.values(table).sort((a: any, b: any) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.goalDifference - a.goalDifference;
  });

  return result;
};

export const PointTableService = {
  getPointTableFromDB,
};
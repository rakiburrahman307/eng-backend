const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://admin:MostStrongPassword@31.97.117.41:27017/eng?authSource=admin&directConnection=true');
  const db = mongoose.connection.db;

  const match = await db.collection('matches').findOne({ _id: new mongoose.Types.ObjectId('6a8ecd56acb4c1c71d5a6232') });
  console.log('Match teams:', { homeTeam: match.homeTeam, awayTeam: match.awayTeam });
  console.log('Match reviews count:', match.matchReview.length);

  // Check players in review
  const playerIds = match.matchReview.map(r => r.player).filter(Boolean);
  const players = await db.collection('users').find({ _id: { $in: playerIds } }).project({ selectTeam: 1, firstName: 1, lastName: 1 }).toArray();

  const teamCounts = {};
  players.forEach(p => {
    const t = String(p.selectTeam);
    teamCounts[t] = (teamCounts[t] || 0) + 1;
  });

  console.log('Team breakdown of reviewed players:', teamCounts);
  console.log('Is only ONE team reviewed?:', Object.keys(teamCounts).length === 1);

  // Check match 6a8f007da54e3d518174e2a7
  const match2 = await db.collection('matches').findOne({ _id: new mongoose.Types.ObjectId('6a8f007da54e3d518174e2a7') });
  console.log('Match2 teams:', { homeTeam: match2.homeTeam, awayTeam: match2.awayTeam });
  const playerIds2 = match2.matchReview.map(r => r.player).filter(Boolean);
  const players2 = await db.collection('users').find({ _id: { $in: playerIds2 } }).project({ selectTeam: 1 }).toArray();
  const teamCounts2 = {};
  players2.forEach(p => {
    const t = String(p.selectTeam);
    teamCounts2[t] = (teamCounts2[t] || 0) + 1;
  });
  console.log('Team breakdown for Match2:', teamCounts2);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

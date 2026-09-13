const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://admin:MostStrongPassword@31.97.117.41:27017/eng?authSource=admin&directConnection=true');
  const db = mongoose.connection.db;

  const teams = await db.collection('teams').find({
    teamName: { $regex: /JDA|RS7/i }
  }).toArray();
  console.log('Teams found:', teams.map(t => ({ id: t._id, name: t.teamName })));

  const teamIds = teams.map(t => t._id);
  const matches = await db.collection('matches').find({
    $or: [{ homeTeam: { $in: teamIds } }, { awayTeam: { $in: teamIds } }]
  }).toArray();

  console.log('Matches found:', matches.length);
  for (const m of matches) {
    const goals = await db.collection('matchresults').find({ match: m._id, eventType: 'goal' }).toArray();
    console.log(`Match ${m._id}: score ${m.homeScore}-${m.awayScore}, goals count: ${goals.length}`);
    for (const g of goals) {
      console.log('  Goal doc:', { id: g._id, player: g.player, minute: g.minute, eventMeta: g.eventMeta });
    }
  }

  await mongoose.disconnect();
}
check().catch(console.error);

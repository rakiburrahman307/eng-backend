const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://admin:MostStrongPassword@31.97.117.41:27017/eng?authSource=admin&directConnection=true');
  const db = mongoose.connection.db;

  const allGoals = await db.collection('matchresults').find({ eventType: 'goal' }).toArray();
  console.log('Total goal matchresults:', allGoals.length);

  const matchIds = Array.from(new Set(allGoals.map(g => g.match.toString())));
  console.log('Matches with goals:', matchIds.length);

  for (const mId of matchIds) {
    const match = await db.collection('matches').findOne({ _id: new mongoose.Types.ObjectId(mId) });
    const matchGoals = allGoals.filter(g => g.match.toString() === mId);
    console.log(`Match ${mId} (status: ${match?.status}): score ${match?.homeScore}-${match?.awayScore}, goal docs: ${matchGoals.length}`);
  }

  await mongoose.disconnect();
}
check();

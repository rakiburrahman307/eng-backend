const mongoose = require('mongoose');

async function checkDuplicates() {
  await mongoose.connect('mongodb://admin:MostStrongPassword@31.97.117.41:27017/eng?authSource=admin&directConnection=true');
  const db = mongoose.connection.db;
  const dups = await db.collection('matchresults').aggregate([
    { $match: { eventType: 'goal' } },
    { $group: {
        _id: { match: '$match', player: '$player', minute: '$minute', team: '$team' },
        count: { $sum: 1 },
        ids: { $push: '$_id' },
        createdAts: { $push: '$createdAt' }
      }
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 }
  ]).toArray();

  console.log(`Found ${dups.length} duplicate goal groups`);
  for (const d of dups) {
    console.log(JSON.stringify(d, null, 2));
  }

  // Also check all duplicate matchresults regardless of minute (e.g. same match, same player, eventType: goal)
  const playerMatchDups = await db.collection('matchresults').aggregate([
    { $match: { eventType: 'goal' } },
    { $group: {
        _id: { match: '$match', player: '$player' },
        count: { $sum: 1 },
        minutes: { $push: '$minute' },
        ids: { $push: '$_id' },
        createdAts: { $push: '$createdAt' }
      }
    },
    { $match: { count: { $gt: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]).toArray();

  console.log(`\nPlayer match duplicate goal groups (same match & player): ${playerMatchDups.length}`);
  for (const d of playerMatchDups.slice(0, 5)) {
    console.log(JSON.stringify(d, null, 2));
  }

  await mongoose.disconnect();
}

checkDuplicates().catch(console.error);

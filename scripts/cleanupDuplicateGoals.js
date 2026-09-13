const mongoose = require('mongoose');

async function cleanup() {
  await mongoose.connect('mongodb://admin:MostStrongPassword@31.97.117.41:27017/eng?authSource=admin&directConnection=true');
  const db = mongoose.connection.db;

  console.log('--- Starting Duplicate Goal Cleanup on Live DB ---');

  // 1. Find all duplicate groups
  const dups = await db.collection('matchresults').aggregate([
    { $match: { eventType: 'goal' } },
    { $sort: { createdAt: 1 } },
    { $group: {
        _id: { match: '$match', player: '$player', minute: '$minute', team: '$team' },
        count: { $sum: 1 },
        docs: { $push: { _id: '$_id', createdAt: '$createdAt', assist: '$eventMeta.assist' } }
      }
    },
    { $match: { count: { $gt: 1 } } }
  ]).toArray();

  console.log(`Found ${dups.length} duplicate goal groups.`);

  let totalDeleted = 0;
  const affectedPlayers = new Set();
  const affectedAssistPlayers = new Set();
  const removedGoalsCountByPlayer = {};

  for (const group of dups) {
    const [keepDoc, ...duplicateDocs] = group.docs;
    const deleteIds = duplicateDocs.map(d => d._id);

    const playerId = group._id.player ? group._id.player.toString() : null;
    if (playerId) {
      affectedPlayers.add(playerId);
      removedGoalsCountByPlayer[playerId] = (removedGoalsCountByPlayer[playerId] || 0) + deleteIds.length;
    }

    for (const d of duplicateDocs) {
      if (d.assist) {
        affectedAssistPlayers.add(d.assist.toString());
      }
    }

    const delRes = await db.collection('matchresults').deleteMany({
      _id: { $in: deleteIds }
    });
    totalDeleted += delRes.deletedCount;
  }

  console.log(`Successfully deleted ${totalDeleted} duplicate goal records.`);

  // 2. Recalculate PlayerStats for all affected players
  console.log('\n--- Recalculating PlayerStats ---');
  for (const playerId of affectedPlayers) {
    const actualGoals = await db.collection('matchresults').countDocuments({
      player: new mongoose.Types.ObjectId(playerId),
      eventType: 'goal'
    });

    const actualAssists = await db.collection('matchresults').countDocuments({
      'eventMeta.assist': new mongoose.Types.ObjectId(playerId),
      eventType: 'goal'
    });

    await db.collection('playerstats').updateMany(
      { player: new mongoose.Types.ObjectId(playerId) },
      { $set: { goals: actualGoals, assists: actualAssists } }
    );

    console.log(`Player ${playerId}: updated goals = ${actualGoals}, assists = ${actualAssists}`);

    // Reconcile coins if goalCoin was awarded multiple times
    const pe = await db.collection('playereconomies').findOne();
    const goalCoin = pe?.goal?.coin || 0;
    const goalMV = pe?.goal?.marketValue || 0;

    const excessGoals = removedGoalsCountByPlayer[playerId] || 0;
    if (excessGoals > 0 && (goalCoin > 0 || goalMV > 0)) {
      const user = await db.collection('users').findOne({ _id: new mongoose.Types.ObjectId(playerId) });
      if (user) {
        const excessCoins = excessGoals * goalCoin;
        const excessMV = excessGoals * goalMV;

        const newCoins = Math.max(10000, (user.engCoine || 0) - excessCoins);
        const newMV = Math.max(0, (user.marketValue || 0) - excessMV);

        await db.collection('users').updateOne(
          { _id: new mongoose.Types.ObjectId(playerId) },
          { $set: { engCoine: newCoins, marketValue: newMV } }
        );
        console.log(`  Adjusted coins for ${user.firstName} ${user.lastName}: ${user.engCoine} -> ${newCoins}, MV -> ${newMV}`);
      }
    }
  }

  // Also check affected assist players
  for (const assistId of affectedAssistPlayers) {
    const actualAssists = await db.collection('matchresults').countDocuments({
      'eventMeta.assist': new mongoose.Types.ObjectId(assistId),
      eventType: 'goal'
    });
    await db.collection('playerstats').updateMany(
      { player: new mongoose.Types.ObjectId(assistId) },
      { $set: { assists: actualAssists } }
    );
  }

  // 3. Final verification of matches
  console.log('\n--- Final Match Verification ---');
  const allGoals = await db.collection('matchresults').find({ eventType: 'goal' }).toArray();
  const matchIds = Array.from(new Set(allGoals.map(g => g.match.toString())));
  for (const mId of matchIds) {
    const match = await db.collection('matches').findOne({ _id: new mongoose.Types.ObjectId(mId) });
    const matchGoals = allGoals.filter(g => g.match.toString() === mId);
    console.log(`Match ${mId}: Score ${match?.homeScore}-${match?.awayScore}, Total Goal records: ${matchGoals.length}`);
  }

  await mongoose.disconnect();
  console.log('\n--- Cleanup Complete ---');
}

cleanup().catch(console.error);

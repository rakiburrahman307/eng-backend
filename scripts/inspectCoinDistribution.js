const mongoose = require('mongoose');
const uri = 'mongodb://admin:MostStrongPassword@31.97.117.41:27017/eng?authSource=admin&directConnection=true';

async function check() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const users = await db.collection('users').find({
    role: { $in: ['PLAYER', 'TOURNAMENT_PLAYER'] },
    engCoine: { $exists: true }
  }).toArray();

  console.log(`Total players with engCoine: ${users.length}`);

  // Print distribution of coins
  const coinDist = {};
  users.forEach(u => {
    const c = u.engCoine;
    coinDist[c] = (coinDist[c] || 0) + 1;
  });
  console.log('Coin distribution among players:', coinDist);

  // Check players who have strange or different coins
  console.log('\nSample players with different coin balances:');
  const samples = {};
  users.forEach(u => {
    if (!samples[u.engCoine]) {
      samples[u.engCoine] = u;
    }
  });

  for (const [coins, u] of Object.entries(samples)) {
    const subs = await db.collection('subscriptions').find({ user: u._id }).toArray();
    console.log(`\nPlayer: ${u.firstName} ${u.lastName} (_id: ${u._id}) | Coins: ${coins} | MarketValue: ${u.marketValue}`);
    console.log(`  Subscriptions count: ${subs.length}`);
    subs.forEach(s => console.log(`    Sub: ${s._id} | pkg: ${s.package} | status: ${s.status} | subId: ${s.subscriptionId} | date: ${s.createdAt}`));
  }

  await mongoose.disconnect();
}
check().catch(console.error);

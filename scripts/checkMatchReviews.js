const mongoose = require('mongoose');

async function check() {
  await mongoose.connect('mongodb://admin:MostStrongPassword@31.97.117.41:27017/eng?authSource=admin&directConnection=true');
  const db = mongoose.connection.db;

  const matchesWithReview = await db.collection('matches').find({
    'matchReview.0': { $exists: true }
  }).toArray();
  console.log('Matches with matchReview:', matchesWithReview.length);

  for (const m of matchesWithReview) {
    console.log(`Match ${m._id}: reviews count = ${m.matchReview.length}`);
    console.log('  finishedAt:', m.finishedAt, 'updatedAt:', m.updatedAt);
    console.log('  reviews summary:', m.matchReview.map(r => ({ team: r.team, player: r.player, rating: r.rating })));
  }

  // Also check MatchEvaluation (referee ratings)
  const evaluations = await db.collection('matchevaluations').find().toArray();
  console.log('\nTotal MatchEvaluations:', evaluations.length);
  for (const ev of evaluations.slice(0, 5)) {
    console.log(`Evaluation ${ev._id} for match ${ev.match}: homeRating = ${ev.homeTeamRating}, awayRating = ${ev.awayTeamRating}, motm = ${ev.manOfTheMatch}`);
  }

  await mongoose.disconnect();
}
check().catch(console.error);

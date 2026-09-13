const mongoose = require('mongoose');

async function main() {
  await mongoose.connect('mongodb://admin:MostStrongPassword@31.97.117.41:27017/eng?authSource=admin&directConnection=true');
  const db = mongoose.connection.db;

  const evals = await db.collection('matchevaluations').find().sort({ createdAt: -1 }).limit(3).toArray();
  console.log('Recent MatchEvaluations count:', evals.length);
  if (evals.length > 0) {
    console.log('Latest MatchEvaluation:', JSON.stringify(evals[0], null, 2));
  }

  const matchesWithReview = await db.collection('matches').find({
    matchReview: { $exists: true, $not: { $size: 0 } }
  }).sort({ updatedAt: -1 }).limit(3).toArray();

  console.log('Matches with matchReview count:', matchesWithReview.length);
  if (matchesWithReview.length > 0) {
    console.log('Sample match with review:', {
      _id: matchesWithReview[0]._id,
      homeTeam: matchesWithReview[0].homeTeam,
      awayTeam: matchesWithReview[0].awayTeam,
      matchReview: matchesWithReview[0].matchReview
    });
  }

  // Also check recent finished matches
  const recentFinished = await db.collection('matches').find({ status: 'finished' }).sort({ finishedAt: -1, updatedAt: -1 }).limit(3).toArray();
  console.log('Recent Finished Matches:', recentFinished.map(m => ({
    _id: m._id,
    finishedAt: m.finishedAt,
    updatedAt: m.updatedAt,
    hasReview: m.matchReview ? m.matchReview.length : 0,
    matchDate: m.matchDate
  })));

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

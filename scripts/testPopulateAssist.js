const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://admin:MostStrongPassword@31.97.117.41:27017/eng?authSource=admin&directConnection=true');
  const db = mongoose.connection.db;

  const mr = await db.collection('matchresults').findOne({
    eventType: 'goal',
    'eventMeta.assist': { $exists: true, $ne: null }
  });
  console.log('Raw MR from DB:', mr);

  const assistUser = await db.collection('users').findOne({ _id: mr.eventMeta.assist });
  console.log('Assist User from DB:', assistUser ? { id: assistUser._id, name: `${assistUser.firstName} ${assistUser.lastName}` } : 'NOT FOUND');

  const matchResultSchema = new mongoose.Schema({
    match: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    eventType: String,
    minute: Number,
    eventMeta: {
      goalType: String,
      assist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }
  });

  const userSchema = new mongoose.Schema({
    firstName: String,
    lastName: String
  });

  const User = mongoose.models.User || mongoose.model('User', userSchema);
  const MatchResult = mongoose.models.MatchResult || mongoose.model('MatchResult', matchResultSchema);

  const doc = await MatchResult.findById(mr._id)
    .populate('player', 'firstName lastName')
    .populate('eventMeta.assist', 'firstName lastName');

  console.log('\n--- Populated Result ---');
  console.log('player:', doc.player);
  console.log('eventMeta:', doc.eventMeta);
  console.log('eventMeta.assist:', doc.eventMeta?.assist);

  // Now test formatting as done in getSingleMatchFromDB:
  const formattedAssist = doc.eventMeta?.assist
    ? {
        _id: doc.eventMeta.assist._id || doc.eventMeta.assist,
        firstName: doc.eventMeta.assist.firstName || "",
        lastName: doc.eventMeta.assist.lastName || "",
      }
    : null;
  console.log('formattedAssist:', formattedAssist);

  await mongoose.disconnect();
}
test().catch(console.error);

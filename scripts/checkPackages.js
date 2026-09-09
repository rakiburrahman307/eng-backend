const mongoose = require('mongoose');
const uri = 'mongodb://admin:MostStrongPassword@31.97.117.41:27017/eng?authSource=admin&directConnection=true';

async function check() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const packages = await db.collection('packages').find().toArray();
  console.log('--- PACKAGES ---');
  packages.forEach(p => {
    console.log(`ID: ${p._id} | Title: "${p.title}" | userType: ${p.userType} | packageType: ${p.packageType} | credit: ${p.credit} | price: ${p.price} | status: ${p.status}`);
  });

  console.log('\n--- RECENT SUBSCRIPTIONS ---');
  const subs = await db.collection('subscriptions').find().sort({ createdAt: -1 }).limit(10).toArray();
  for (const s of subs) {
    const u = await db.collection('users').findOne({ _id: s.user });
    const pkg = await db.collection('packages').findOne({ _id: s.package });
    console.log(`Sub ID: ${s._id} | User: ${u?.firstName} ${u?.lastName} (${u?.role}, parentId: ${u?.parentId}) | engCoine: ${u?.engCoine} | Package: "${pkg?.title}" (pkg credit: ${pkg?.credit}) | Sub Price: ${s.price}`);
  }

  await mongoose.disconnect();
}
check().catch(console.error);

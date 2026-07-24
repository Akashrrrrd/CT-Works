const { MongoClient } = require('mongodb');
const url = 'mongodb+srv://aakashrajendran2004_db_user:DgsXV9M6nexbmJE6@ct-users.eb31d0y.mongodb.net/?appName=CT-Users';

async function updateTemplates() {
  let client;
  try {
    client = new MongoClient(url);
    await client.connect();
    const db = client.db('ct-adequacy');
    const templates = db.collection('templates');
    
    // Delete all non-IED templates
    const deleteResult = await templates.deleteMany({
      iedType: { $in: ['tpl-differential', 'tpl-distance', 'tpl-breaker-failure'] }
    });
    console.log('✓ Deleted old templates:', deleteResult.deletedCount);
    
    // Update RED670 to be an IED template
    const updateResult = await templates.updateOne(
      { name: { $regex: 'RED670' } },
      { $set: {
        iedType: 'tpl-red670',
        formula: 'ct-adequacy:tpl-red670',
        isIEDTemplate: true,
        hitachiReference: 'N-19957 2-DF4W'
      }}
    );
    console.log('✓ Updated RED670:', updateResult.modifiedCount);
    
    // List final templates
    const final = await templates.find({}).toArray();
    console.log('\n=== FINAL TEMPLATES (Only 2) ===');
    final.forEach(t => {
      console.log('✓', t.name, '(' + t.iedType + ')');
    });
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    if (client) await client.close();
  }
}

updateTemplates();

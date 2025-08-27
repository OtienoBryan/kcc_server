const db = require('./database/db');

async function insertSampleRegions() {
  try {
    console.log('Inserting sample regions...');
    
    // Insert regions for Kenya (country_id = 1)
    const kenyaRegions = [
      'Nairobi',
      'Mombasa', 
      'Kisumu',
      'Nakuru',
      'Eldoret',
      'Thika',
      'Machakos',
      'Kakamega'
    ];
    
    // Insert regions for Tanzania (country_id = 2)
    const tanzaniaRegions = [
      'Dar es Salaam',
      'Arusha',
      'Mwanza',
      'Dodoma',
      'Tanga',
      'Mbeya',
      'Morogoro',
      'Iringa'
    ];
    
    for (const region of kenyaRegions) {
      await db.query('INSERT INTO Regions (name, countryId) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = name', [region, 1]);
      console.log(`Inserted region: ${region} for Kenya`);
    }
    
    for (const region of tanzaniaRegions) {
      await db.query('INSERT INTO Regions (name, countryId) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = name', [region, 2]);
      console.log(`Inserted region: ${region} for Tanzania`);
    }
    
    console.log('Sample regions inserted successfully!');
    
    // Verify the regions
    const [kenyaRegionsResult] = await db.query('SELECT * FROM Regions WHERE countryId = 1');
    const [tanzaniaRegionsResult] = await db.query('SELECT * FROM Regions WHERE countryId = 2');
    
    console.log(`Kenya regions: ${kenyaRegionsResult.length}`);
    console.log(`Tanzania regions: ${tanzaniaRegionsResult.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error inserting sample regions:', error);
    process.exit(1);
  }
}

insertSampleRegions();

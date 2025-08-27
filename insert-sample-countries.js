const db = require('./database/db');

async function insertSampleCountries() {
  try {
    console.log('Inserting sample countries...');
    
    // Insert Kenya with ID 1
    await db.query('INSERT INTO Country (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = name', [1, 'Kenya']);
    console.log('Inserted country: Kenya with ID 1');
    
    // Insert Tanzania with ID 2
    await db.query('INSERT INTO Country (id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = name', [2, 'Tanzania']);
    console.log('Inserted country: Tanzania with ID 2');
    
    console.log('Sample countries inserted successfully!');
    
    // Verify the countries
    const [countriesResult] = await db.query('SELECT * FROM Country ORDER BY id');
    console.log('Countries in database:');
    countriesResult.forEach(country => {
      console.log(`ID: ${country.id}, Name: ${country.name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error inserting sample countries:', error);
    process.exit(1);
  }
}

insertSampleCountries();

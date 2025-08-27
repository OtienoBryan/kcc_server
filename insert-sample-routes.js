const db = require('./database/db');

async function insertSampleRoutes() {
  try {
    console.log('Inserting sample routes...');
    
    const routes = [
      'Nairobi Central',
      'Mombasa Coast',
      'Dar Central',
      'Arusha North',
      'Kisumu West',
      'Nakuru East',
      'Eldoret North',
      'Mwanza Central',
      'Dodoma Central',
      'Tanga Coast',
      'Thika Industrial',
      'Machakos East',
      'Kakamega West',
      'Mbeya Highlands',
      'Morogoro Central',
      'Iringa South'
    ];
    
    for (const route of routes) {
      await db.query('INSERT INTO routes (name) VALUES (?) ON DUPLICATE KEY UPDATE name = name', [route]);
      console.log(`Inserted route: ${route}`);
    }
    
    console.log('Sample routes inserted successfully!');
    
    // Verify the routes
    const [routesResult] = await db.query('SELECT * FROM routes ORDER BY name');
    console.log(`Total routes in database: ${routesResult.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error inserting sample routes:', error);
    process.exit(1);
  }
}

insertSampleRoutes();

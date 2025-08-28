// Test script for Vercel deployment debugging
require('dotenv').config();

console.log('=== Vercel Deployment Test ===');
console.log('Environment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_HOST:', process.env.DB_HOST ? 'SET' : 'NOT SET');
console.log('DB_USER:', process.env.DB_USER ? 'SET' : 'NOT SET');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? 'SET' : 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME ? 'SET' : 'NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');

// Test database connection
async function testDatabase() {
  try {
    console.log('\n=== Testing Database Connection ===');
    const db = require('./database/db');
    
    // Test simple query
    console.log('Testing simple query...');
    const [result] = await db.query('SELECT 1 as test');
    console.log('Simple query result:', result);
    
    // Test SHOW TABLES
    console.log('\nTesting SHOW TABLES...');
    const [tables] = await db.query('SHOW TABLES');
    console.log('Available tables:', tables);
    
    // Test countries table
    console.log('\nTesting countries table...');
    try {
      const [countries] = await db.query('SELECT * FROM countries LIMIT 5');
      console.log('Countries found:', countries.length);
      if (countries.length > 0) {
        console.log('Sample country:', countries[0]);
      }
    } catch (err) {
      console.error('Error querying countries table:', err.message);
      
      // Try alternative table names
      const alternativeNames = ['Countries', 'Country', 'country'];
      for (const name of alternativeNames) {
        try {
          console.log(`Trying table name: ${name}`);
          const [rows] = await db.query(`SELECT * FROM ${name} LIMIT 5`);
          console.log(`Table ${name} found with ${rows.length} rows`);
          break;
        } catch (altErr) {
          console.log(`Table ${name} not accessible:`, altErr.message);
        }
      }
    }
    
    // Test SalesRep table
    console.log('\nTesting SalesRep table...');
    try {
      const [salesReps] = await db.query('SELECT * FROM SalesRep LIMIT 5');
      console.log('SalesReps found:', salesReps.length);
      if (salesReps.length > 0) {
        console.log('Sample sales rep:', salesReps[0]);
      }
    } catch (err) {
      console.error('Error querying SalesRep table:', err.message);
      
      // Try alternative table names
      const alternativeNames = ['salesReps', 'sales_reps', 'salesrep'];
      for (const name of alternativeNames) {
        try {
          console.log(`Trying table name: ${name}`);
          const [rows] = await db.query(`SELECT * FROM ${name} LIMIT 5`);
          console.log(`Table ${name} found with ${rows.length} rows`);
          break;
        } catch (altErr) {
          console.log(`Table ${name} not accessible:`, altErr.message);
        }
      }
    }
    
    console.log('\n=== Database Test Completed ===');
    
  } catch (error) {
    console.error('Database test failed:', error);
  }
}

// Test module loading
async function testModules() {
  console.log('\n=== Testing Module Loading ===');
  
  try {
    console.log('Testing database module...');
    const db = require('./database/db');
    console.log('Database module loaded successfully');
    
    console.log('Testing salesController...');
    const salesController = require('./controllers/salesController');
    console.log('SalesController loaded successfully');
    
    console.log('Testing salesRoutes...');
    const salesRoutes = require('./routes/salesRoutes');
    console.log('SalesRoutes loaded successfully');
    
  } catch (error) {
    console.error('Module loading failed:', error.message);
  }
}

// Run tests
async function runTests() {
  await testModules();
  await testDatabase();
  
  console.log('\n=== All Tests Completed ===');
  process.exit(0);
}

runTests().catch(console.error);

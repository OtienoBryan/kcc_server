// Simple environment and database check
require('dotenv').config();

console.log('=== Environment Check ===');
console.log('Current working directory:', process.cwd());
console.log('Node version:', process.version);
console.log('Platform:', process.platform);

console.log('\n=== Environment Variables ===');
const envVars = [
  'NODE_ENV',
  'DB_HOST', 
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'PORT'
];

envVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    // Mask sensitive values
    if (varName.includes('PASSWORD') || varName.includes('SECRET')) {
      console.log(`${varName}: ${value.substring(0, 3)}***`);
    } else {
      console.log(`${varName}: ${value}`);
    }
  } else {
    console.log(`${varName}: NOT SET`);
  }
});

console.log('\n=== Database Connection Test ===');
try {
  const db = require('./database/db');
  console.log('Database module loaded successfully');
  
  // Test connection
  db.query('SELECT 1 as test')
    .then(([result]) => {
      console.log('Database connection successful:', result[0]);
      process.exit(0);
    })
    .catch(err => {
      console.error('Database connection failed:', err.message);
      console.error('Error code:', err.code);
      console.error('Error errno:', err.errno);
      process.exit(1);
    });
    
} catch (error) {
  console.error('Failed to load database module:', error.message);
  process.exit(1);
}

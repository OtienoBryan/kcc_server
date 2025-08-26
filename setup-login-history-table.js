const fs = require('fs');
const path = require('path');
const db = require('./database/db');

async function setupLoginHistoryTable() {
  try {
    console.log('Setting up LoginHistory table...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'database', 'add_login_history_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    // Execute each statement, skipping index creation if they already exist
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          console.log('Executing:', statement.trim().substring(0, 50) + '...');
          await db.query(statement);
        } catch (error) {
          // Skip index creation errors (they might already exist)
          if (error.code === 'ER_DUP_KEYNAME') {
            console.log('⚠️  Index already exists, skipping...');
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('✅ LoginHistory table setup completed successfully!');
    
    // Verify the table was created
    const [tables] = await db.query('SHOW TABLES LIKE "LoginHistory"');
    if (tables.length > 0) {
      console.log('✅ LoginHistory table exists');
      
      // Check table structure
      const [columns] = await db.query('DESCRIBE LoginHistory');
      console.log('Table structure:', columns);
      
      // Check if there's data
      const [rows] = await db.query('SELECT COUNT(*) as count FROM LoginHistory');
      console.log('Records in table:', rows[0].count);
    } else {
      console.log('❌ LoginHistory table was not created');
    }
    
  } catch (error) {
    console.error('❌ Error setting up LoginHistory table:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
  } finally {
    process.exit(0);
  }
}

// Run the setup
setupLoginHistoryTable();

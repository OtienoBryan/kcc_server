console.log('=== MY VISIBILITY REPORT CONTROLLER IS LOADING ===');

const db = require('../database/db');

// Fetch all my visibility reports (all columns, no joins)
exports.getAllMyVisibilityReports = async (req, res) => {
  console.log('getAllMyVisibilityReports function called');
  try {
    const sql = `
      SELECT 
        vr.*,
        c.name as outlet,
        c.countryId,
        co.name as country,
        u.name as salesRep
      FROM VisibilityReport vr
      LEFT JOIN Clients c ON vr.clientId = c.id
      LEFT JOIN Country co ON c.countryId = co.id
      LEFT JOIN SalesRep u ON vr.userId = u.id
      ORDER BY vr.createdAt DESC
    `;
    console.log('SQL Query:', sql);
    const [results] = await db.query(sql);
    console.log('Query results:', results);
    console.log('Number of results:', results.length);
    
    if (results.length > 0) {
      console.log('First result sample:', results[0]);
      console.log('First result outlet:', results[0].outlet);
      console.log('First result clientId:', results[0].clientId);
      console.log('First result countryId:', results[0].countryId);
      console.log('First result country:', results[0].country);
      console.log('First result salesRep:', results[0].salesRep);
    } else {
      console.log('No results returned from database');
    }
    
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Error in getAllMyVisibilityReports:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}; 

// Test endpoint to check database tables
exports.testDatabase = async (req, res) => {
  console.log('testDatabase function called');
  try {
    // Check if VisibilityReport table exists and has data
    const [visibilityResults] = await db.query('SELECT COUNT(*) as count FROM VisibilityReport');
    console.log('VisibilityReport count:', visibilityResults[0].count);
    
    // Check if Clients table exists and has data
    const [clientsResults] = await db.query('SELECT COUNT(*) as count FROM Clients');
    console.log('Clients count:', clientsResults[0].count);
    
    // Check if Country table exists and has data
    const [countryResults] = await db.query('SELECT COUNT(*) as count FROM Country');
    console.log('Country count:', countryResults[0].count);
    
    // Check if SalesRep table exists and has data
    const [salesRepResults] = await db.query('SELECT COUNT(*) as count FROM SalesRep');
    console.log('SalesRep count:', salesRepResults[0].count);
    
    // Check sample data from each table
    const [visibilitySample] = await db.query('SELECT * FROM VisibilityReport LIMIT 1');
    const [clientsSample] = await db.query('SELECT * FROM Clients LIMIT 1');
    const [countrySample] = await db.query('SELECT * FROM Country LIMIT 1');
    const [salesRepSample] = await db.query('SELECT * FROM SalesRep LIMIT 1');
    
    console.log('VisibilityReport sample:', visibilitySample[0]);
    console.log('Clients sample:', clientsSample[0]);
    console.log('Country sample:', countrySample[0]);
    console.log('SalesRep sample:', salesRepSample[0]);
    
    // Test the actual JOIN query
    const [joinTest] = await db.query(`
      SELECT 
        vr.id, vr.clientId, vr.userId,
        c.name as clientName, c.countryId,
        co.name as countryName,
        u.name as salesRepName
      FROM VisibilityReport vr
      LEFT JOIN Clients c ON vr.clientId = c.id
      LEFT JOIN Country co ON c.countryId = co.id
      LEFT JOIN SalesRep u ON vr.userId = u.id
      LIMIT 1
    `);
    console.log('JOIN test result:', joinTest[0]);
    
    res.json({ 
      success: true, 
      counts: {
        visibilityReports: visibilityResults[0].count,
        clients: clientsResults[0].count,
        countries: countryResults[0].count,
        salesReps: salesRepResults[0].count
      },
      samples: {
        visibilityReport: visibilitySample[0],
        client: clientsSample[0],
        country: countrySample[0],
        salesRep: salesRepSample[0]
      },
      joinTest: joinTest[0]
    });
  } catch (err) {
    console.error('Error in testDatabase:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}; 
console.log('=== VISIBILITY REPORT CONTROLLER IS LOADING ===');

const db = require('../database/db');

// Fetch all visibility reports (all columns, no joins)
exports.getAllVisibilityReports = async (req, res) => {
  console.log('getAllVisibilityReports function called');
  try {
    const sql = `
      SELECT 
        vr.*,
        c.name as outlet,
        c.countryId,
        co.name as country
      FROM VisibilityReport vr
      LEFT JOIN Clients c ON vr.clientId = c.id
      LEFT JOIN Country co ON c.countryId = co.id
      ORDER BY vr.createdAt DESC
    `;
    const [results] = await db.query(sql);
    res.json({ success: true, data: results });
  } catch (err) {
    console.error('Error in getAllVisibilityReports:', err);
    res.status(500).json({ success: false, error: err.message });
  }
}; 
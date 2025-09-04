const express = require('express');
const router = express.Router();
const db = require('../database/db');

router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    
    let query = 'SELECT * FROM JourneyPlan';
    let params = [];
    
    if (date) {
      // Filter by checkInTime for the specific date
      query = `
        SELECT * FROM JourneyPlan 
        WHERE DATE(checkInTime) = ? 
        AND checkInTime IS NOT NULL
      `;
      params = [date];
    }
    
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching journey plans:', err);
    res.status(500).json({ error: 'Failed to fetch journey plans' });
  }
});

module.exports = router; 
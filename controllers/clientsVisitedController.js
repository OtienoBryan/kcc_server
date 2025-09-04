const db = require('../database/db');

const clientsVisitedController = {
  // Get all clients visited with journey plan details
  getClientsVisited: async (req, res) => {
    try {
      console.log('Fetching clients visited data...');
      
      const { startDate, endDate, salesRepId, clientId, status } = req.query;
      
      let whereConditions = [];
      let params = [];
      
      // Build WHERE clause based on query parameters
      if (startDate) {
        whereConditions.push('DATE(jp.checkInTime) >= ?');
        params.push(startDate);
      }
      
      if (endDate) {
        whereConditions.push('DATE(jp.checkInTime) <= ?');
        params.push(endDate);
      }
      
      if (salesRepId) {
        whereConditions.push('jp.userId = ?');
        params.push(salesRepId);
      }
      
      if (clientId) {
        whereConditions.push('jp.clientId = ?');
        params.push(clientId);
      }
      
      if (status !== undefined) {
        whereConditions.push('jp.status = ?');
        params.push(status);
      }
      
      // Only include records with check-in time (actual visits)
      whereConditions.push('jp.checkInTime IS NOT NULL');
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      const query = `
        SELECT 
          jp.id as journeyId,
          jp.userId,
          jp.clientId,
          jp.date,
          jp.checkInTime,
          jp.checkoutTime,
          jp.status,
          jp.latitude,
          jp.longitude,
          jp.notes,
          jp.imageUrl,
          c.name as clientName,
          c.address as clientAddress,
          c.contact as clientPhone,
          c.email as clientEmail,
          s.name as salesRepName,
          s.email as salesRepEmail,
          s.phoneNumber as salesRepPhone,
          s.country as salesRepCountry
        FROM JourneyPlan jp
        LEFT JOIN Clients c ON jp.clientId = c.id
        LEFT JOIN SalesRep s ON jp.userId = s.id
        ${whereClause}
        ORDER BY jp.checkInTime DESC
      `;
      
      console.log('Executing query:', query);
      console.log('Query params:', params);
      
      const [rows] = await db.query(query, params);
      
      console.log(`Fetched ${rows.length} client visit records`);
      
      // Group by date for summary
      const visitsByDate = {};
      const visitsBySalesRep = {};
      const visitsByClient = {};
      
      rows.forEach(visit => {
        // Handle date properly - it might be a Date object or string
        let date = 'Unknown';
        if (visit.date) {
          if (typeof visit.date === 'string') {
            date = visit.date.slice(0, 10);
          } else if (visit.date instanceof Date) {
            date = visit.date.toISOString().slice(0, 10);
          } else {
            // Try to convert to Date and then to string
            date = new Date(visit.date).toISOString().slice(0, 10);
          }
        }
        const salesRepId = visit.userId;
        const clientId = visit.clientId;
        
        // Group by date
        if (!visitsByDate[date]) {
          visitsByDate[date] = {
            date,
            totalVisits: 0,
            uniqueClients: new Set(),
            salesReps: new Set()
          };
        }
        visitsByDate[date].totalVisits++;
        visitsByDate[date].uniqueClients.add(clientId);
        visitsByDate[date].salesReps.add(salesRepId);
        
        // Group by sales rep
        if (!visitsBySalesRep[salesRepId]) {
          visitsBySalesRep[salesRepId] = {
            salesRepId,
            salesRepName: visit.salesRepName,
            totalVisits: 0,
            uniqueClients: new Set(),
            dates: new Set()
          };
        }
        visitsBySalesRep[salesRepId].totalVisits++;
        visitsBySalesRep[salesRepId].uniqueClients.add(clientId);
        visitsBySalesRep[salesRepId].dates.add(date);
        
        // Group by client
        if (!visitsByClient[clientId]) {
          visitsByClient[clientId] = {
            clientId,
            clientName: visit.clientName,
            totalVisits: 0,
            salesReps: new Set(),
            dates: new Set()
          };
        }
        visitsByClient[clientId].totalVisits++;
        visitsByClient[clientId].salesReps.add(salesRepId);
        visitsByClient[clientId].dates.add(date);
      });
      
      // Convert sets to arrays for JSON serialization
      const summary = {
        visitsByDate: Object.values(visitsByDate).map(item => ({
          ...item,
          uniqueClients: item.uniqueClients.size,
          salesReps: item.salesReps.size
        })),
        visitsBySalesRep: Object.values(visitsBySalesRep).map(item => ({
          ...item,
          uniqueClients: item.uniqueClients.size,
          dates: Array.from(item.dates)
        })),
        visitsByClient: Object.values(visitsByClient).map(item => ({
          ...item,
          salesReps: item.salesReps.size,
          dates: Array.from(item.dates)
        })),
        totalVisits: rows.length,
        totalUniqueClients: Object.keys(visitsByClient).length,
        totalSalesReps: Object.keys(visitsBySalesRep).length
      };
      
      res.json({
        success: true,
        data: rows,
        summary,
        count: rows.length
      });
      
    } catch (error) {
      console.error('Error fetching clients visited data:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch clients visited data',
        details: error.message 
      });
    }
  },

  // Get clients visited summary statistics
  getClientsVisitedSummary: async (req, res) => {
    try {
      console.log('Fetching clients visited summary...');
      
      const { startDate, endDate } = req.query;
      
      let dateFilter = '';
      let params = [];
      
      if (startDate && endDate) {
        dateFilter = 'AND DATE(jp.checkInTime) BETWEEN ? AND ?';
        params.push(startDate, endDate);
      } else if (startDate) {
        dateFilter = 'AND DATE(jp.checkInTime) >= ?';
        params.push(startDate);
      } else if (endDate) {
        dateFilter = 'AND DATE(jp.checkInTime) <= ?';
        params.push(endDate);
      }
      
      const query = `
        SELECT 
          COUNT(*) as totalVisits,
          COUNT(DISTINCT jp.clientId) as uniqueClients,
          COUNT(DISTINCT jp.userId) as activeSalesReps,
          DATE(jp.checkInTime) as visitDate,
          COUNT(*) as visitsPerDay
        FROM JourneyPlan jp
        WHERE jp.checkInTime IS NOT NULL ${dateFilter}
        GROUP BY DATE(jp.checkInTime)
        ORDER BY visitDate DESC
      `;
      
      const [rows] = await db.query(query, params);
      
      // Calculate totals
      const totalVisits = rows.reduce((sum, row) => sum + row.visitsPerDay, 0);
      const uniqueClients = new Set(rows.map(row => row.uniqueClients)).size;
      const activeSalesReps = new Set(rows.map(row => row.activeSalesReps)).size;
      
      res.json({
        success: true,
        summary: {
          totalVisits,
          uniqueClients,
          activeSalesReps,
          dailyBreakdown: rows
        }
      });
      
    } catch (error) {
      console.error('Error fetching clients visited summary:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to fetch clients visited summary',
        details: error.message 
      });
    }
  }
};

module.exports = clientsVisitedController;

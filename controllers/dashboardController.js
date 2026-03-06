const db = require('../database/db');

/**
 * Optimized Sales Dashboard Data Endpoint
 * Consolidates multiple API calls into a single optimized query
 */
exports.getSalesDashboardData = async (req, res) => {
  try {
    console.log('[getSalesDashboardData] Starting optimized dashboard data fetch...');
    const startTime = Date.now();

    // Get current month date range
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    // Execute all queries in parallel for better performance
    const [
      salesRepsResult,
      ordersResult,
      leavesResult,
      managersResult,
      targetsResult,
      planogramComplianceResult,
      checkedInRepsResult,
      currentMonthOutletsVisitedResult
    ] = await Promise.allSettled([
      // 1. Get all sales reps with route and region info
      db.query(`
        SELECT sr.id, sr.name, sr.status, sr.route_id_update, r.name as route_name, 
               r.region as region_name
        FROM \`SalesRep\` sr
        LEFT JOIN \`routes\` r ON sr.route_id_update = r.id
        WHERE sr.status = 1
        ORDER BY sr.name
      `),

      // 2. Get all orders with necessary data
      db.query(`
        SELECT 
          so.id,
          so.order_date,
          so.total_amount,
          so.my_status,
          so.client_id,
          c.client_type,
          c.route_id_update
        FROM sales_orders so
        LEFT JOIN Clients c ON so.client_id = c.id
        WHERE so.order_date IS NOT NULL
        ORDER BY so.order_date DESC
      `),

      // 3. Get pending leaves count only
      db.query(`
        SELECT COUNT(*) as pending_count
        FROM leaves
        WHERE status = '0' OR status = 0
      `),

      // 4. Get managers
      db.query(`
        SELECT id, name, email, phoneNumber, country, region, managerTypeId
        FROM managers
        ORDER BY name
      `),

      // 5. Get all targets data
      Promise.all([
        db.query('SELECT sales_rep_id, vapes_target, pouches_target FROM distributors_targets'),
        db.query('SELECT sales_rep_id, vapes_target, pouches_target FROM key_account_targets'),
        db.query('SELECT sales_rep_id, vapes_target, pouches_target FROM retail_targets')
      ]),

      // 6. Get planogram compliance data aggregated by month
      db.query(`
        SELECT 
          DATE_FORMAT(pr.createdAt, '%Y-%m') as month_key,
          DATE_FORMAT(pr.createdAt, '%b %Y') as month,
          COALESCE(SUM(pc.compliance_quantity), 0) as total_target,
          COALESCE(SUM(pr.quantity), 0) as total_actual,
          CASE 
            WHEN COALESCE(SUM(pc.compliance_quantity), 0) > 0 
            THEN ROUND((COALESCE(SUM(pr.quantity), 0) / SUM(pc.compliance_quantity)) * 100, 1)
            ELSE 0 
          END as compliance_percentage
        FROM planogram_compliance pc
        LEFT JOIN outlet_accounts oa ON pc.outlet_account_id = oa.id
        LEFT JOIN Clients c ON c.outlet_account = pc.outlet_account_id
        LEFT JOIN ProductReport pr ON pr.clientId = c.id AND pr.productId = pc.product_id
        WHERE pr.createdAt IS NOT NULL
        GROUP BY DATE_FORMAT(pr.createdAt, '%Y-%m'), DATE_FORMAT(pr.createdAt, '%b %Y')
        HAVING total_target > 0
        ORDER BY month_key DESC
        LIMIT 12
      `),

      // 7. Get count of sales reps who have checked in today
      db.query(`
        SELECT COUNT(DISTINCT jp.userId) as checked_in_count
        FROM \`JourneyPlan\` jp
        INNER JOIN \`SalesRep\` sr ON jp.userId = sr.id
        WHERE sr.status = 1
          AND jp.checkInTime IS NOT NULL
          AND DATE(jp.checkInTime) = CURDATE()
      `),

      // 8. Get unique outlets visited in the current month
      db.query(`
        SELECT COUNT(DISTINCT jp.clientId) as outlets_visited_count
        FROM JourneyPlan jp
        WHERE jp.status IN (1, 2)
          AND jp.clientId IS NOT NULL
          AND jp.date BETWEEN ? AND ?
      `, [currentMonthStart, currentMonthEnd])
    ]);

    // Initialize response data
    const dashboardData = {
      stats: {
        totalSales: 0,
        outletsVisitedThisMonth: 0,
        totalOrders: 0,
        activeReps: 0,
        checkedInReps: 0,
        totalActiveReps: 0,
        avgPerformance: 0
      },
      monthlyData: [],
      topReps: [],
      managers: [],
      pendingLeavesCount: 0,
      newOrdersCount: 0,
      pieChartData: [],
      planogramComplianceData: []
    };

    // Process sales reps
    let salesReps = [];
    if (salesRepsResult.status === 'fulfilled') {
      salesReps = salesRepsResult.value[0] || [];
      
      // Count ALL sales reps (not filtered by status) for the "all sales reps" display
      dashboardData.stats.totalActiveReps = salesReps.length;
      
      console.log('[getSalesDashboardData] Sales reps query result structure:', {
        hasValue: !!salesRepsResult.value,
        valueType: typeof salesRepsResult.value,
        isArray: Array.isArray(salesRepsResult.value),
        valueLength: salesRepsResult.value ? salesRepsResult.value.length : 0,
        firstElementType: salesRepsResult.value && salesRepsResult.value[0] ? typeof salesRepsResult.value[0] : 'N/A',
        firstElementIsArray: salesRepsResult.value && salesRepsResult.value[0] ? Array.isArray(salesRepsResult.value[0]) : false
      });
      console.log('[getSalesDashboardData] Total sales reps fetched:', salesReps.length);
      console.log('[getSalesDashboardData] Total sales reps (all):', dashboardData.stats.totalActiveReps);
      
      if (salesReps.length > 0) {
        const statusCounts = {};
        salesReps.forEach(rep => {
          const status = String(rep.status || 'null');
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        console.log('[getSalesDashboardData] Status breakdown:', statusCounts);
        console.log('[getSalesDashboardData] First rep sample:', {
          id: salesReps[0].id,
          name: salesReps[0].name,
          status: salesReps[0].status,
          statusType: typeof salesReps[0].status
        });
      } else {
        console.warn('[getSalesDashboardData] No sales reps found in result. Raw value:', JSON.stringify(salesRepsResult.value));
      }
    } else {
      console.error('[getSalesDashboardData] Sales reps query failed:', salesRepsResult.reason);
      dashboardData.stats.totalActiveReps = 0;
    }

    // Process checked-in sales reps count
    if (checkedInRepsResult.status === 'fulfilled') {
      const checkedInData = checkedInRepsResult.value[0] || [];
      dashboardData.stats.checkedInReps = checkedInData[0]?.checked_in_count || 0;
      dashboardData.stats.activeReps = dashboardData.stats.checkedInReps; // Keep for backward compatibility
      console.log('[getSalesDashboardData] Checked-in sales reps today:', dashboardData.stats.checkedInReps);
    } else {
      // Fallback if query fails
      dashboardData.stats.checkedInReps = 0;
      dashboardData.stats.activeReps = 0;
      console.error('[getSalesDashboardData] Checked-in query failed:', checkedInRepsResult.reason);
    }
    
    // Ensure we have valid numbers even if queries failed
    if (!dashboardData.stats.totalActiveReps && dashboardData.stats.totalActiveReps !== 0) {
      dashboardData.stats.totalActiveReps = 0;
    }
    if (!dashboardData.stats.checkedInReps && dashboardData.stats.checkedInReps !== 0) {
      dashboardData.stats.checkedInReps = 0;
    }
    if (currentMonthOutletsVisitedResult.status === 'fulfilled') {
      const currentMonthOutletsData = currentMonthOutletsVisitedResult.value[0] || [];
      dashboardData.stats.outletsVisitedThisMonth = Number(currentMonthOutletsData[0]?.outlets_visited_count) || 0;
    } else {
      dashboardData.stats.outletsVisitedThisMonth = 0;
      console.error('[getSalesDashboardData] Current month outlets visited query failed:', currentMonthOutletsVisitedResult.reason);
    }

    // Process targets
    let distTargets = [], keyTargets = [], retailTargets = [];
    if (targetsResult.status === 'fulfilled') {
      [distTargets, keyTargets, retailTargets] = [
        targetsResult.value[0][0],
        targetsResult.value[1][0],
        targetsResult.value[2][0]
      ];
      console.log('[getSalesDashboardData] Targets loaded');
    }

    // Process orders
    let orders = [];
    if (ordersResult.status === 'fulfilled') {
      orders = ordersResult.value[0];
      dashboardData.stats.totalOrders = orders.length;

      // Calculate monthly data
      const monthMap = {};
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      orders.forEach(order => {
        if (!order.order_date || !order.total_amount) return;
        
        const date = new Date(order.order_date);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const amount = Number(order.total_amount);
        
        monthMap[key] = (monthMap[key] || 0) + amount;
        dashboardData.stats.totalSales += amount;
      });

      // Convert to array and sort
      dashboardData.monthlyData = Object.entries(monthMap)
        .map(([key, amount]) => {
          const [year, monthIdx] = key.split('-');
          return {
            month: `${monthNames[Number(monthIdx)]} ${year}`,
            amount: amount,
            sortKey: `${year}-${String(Number(monthIdx) + 1).padStart(2, '0')}`
          };
        })
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
        .map(({ month, amount }) => ({ month, amount }));

      // Calculate new orders count (my_status = 0)
      dashboardData.newOrdersCount = orders.filter(o => o.my_status === 0 || o.my_status === '0').length;

      console.log('[getSalesDashboardData] Orders processed:', orders.length);
    }

    // Calculate sales performance by rep
    if (salesReps.length > 0 && orders.length > 0) {
      // Group orders by route
      const ordersByRoute = {};
      orders.forEach(order => {
        const routeId = order.route_id_update;
        if (!routeId) return;
        
        if (!ordersByRoute[routeId]) {
          ordersByRoute[routeId] = {
            dist: { orders: 0, sales: 0, outlets: new Set() },
            key: { orders: 0, sales: 0, outlets: new Set() },
            retail: { orders: 0, sales: 0, outlets: new Set() }
          };
        }

        const clientType = order.client_type;
        const amount = Number(order.total_amount) || 0;
        
        if (clientType === 3 || clientType === '3') {
          ordersByRoute[routeId].dist.orders++;
          ordersByRoute[routeId].dist.sales += amount;
          ordersByRoute[routeId].dist.outlets.add(order.client_id);
        } else if (clientType === 2 || clientType === '2') {
          ordersByRoute[routeId].key.orders++;
          ordersByRoute[routeId].key.sales += amount;
          ordersByRoute[routeId].key.outlets.add(order.client_id);
        } else if (clientType === 1 || clientType === '1') {
          ordersByRoute[routeId].retail.orders++;
          ordersByRoute[routeId].retail.sales += amount;
          ordersByRoute[routeId].retail.outlets.add(order.client_id);
        }
      });

      // Get total outlets per route per type
      const [clientsByRoute] = await db.query(`
        SELECT route_id_update, client_type, COUNT(*) as count
        FROM Clients
        WHERE route_id_update IS NOT NULL
        GROUP BY route_id_update, client_type
      `);

      const outletCounts = {};
      clientsByRoute.forEach(row => {
        const routeId = row.route_id_update;
        if (!outletCounts[routeId]) {
          outletCounts[routeId] = { dist: 0, key: 0, retail: 0 };
        }
        const type = row.client_type;
        const count = Number(row.count) || 0;
        
        if (type === 3 || type === '3') outletCounts[routeId].dist = count;
        else if (type === 2 || type === '2') outletCounts[routeId].key = count;
        else if (type === 1 || type === '1') outletCounts[routeId].retail = count;
      });

      // Calculate performance for each rep
      const repPerformance = salesReps.map(rep => {
        const routeId = rep.route_id_update;
        const routeData = ordersByRoute[routeId] || { dist: { orders: 0, sales: 0, outlets: new Set() }, key: { orders: 0, sales: 0, outlets: new Set() }, retail: { orders: 0, sales: 0, outlets: new Set() } };
        const outlets = outletCounts[routeId] || { dist: 0, key: 0, retail: 0 };

        // Get targets
        const distTarget = distTargets.find(t => t.sales_rep_id === rep.id) || { vapes_target: 0, pouches_target: 0 };
        const keyTarget = keyTargets.find(t => t.sales_rep_id === rep.id) || { vapes_target: 0, pouches_target: 0 };
        const retailTarget = retailTargets.find(t => t.sales_rep_id === rep.id) || { vapes_target: 0, pouches_target: 0 };

        // Calculate percentages for each type
        const types = [
          {
            name: 'distributors',
            target: (Number(distTarget.vapes_target) || 0) + (Number(distTarget.pouches_target) || 0),
            sales: routeData.dist.sales,
            totalOutlets: outlets.dist,
            outletsWithOrders: routeData.dist.outlets.size
          },
          {
            name: 'key_accounts',
            target: (Number(keyTarget.vapes_target) || 0) + (Number(keyTarget.pouches_target) || 0),
            sales: routeData.key.sales,
            totalOutlets: outlets.key,
            outletsWithOrders: routeData.key.outlets.size
          },
          {
            name: 'retail',
            target: (Number(retailTarget.vapes_target) || 0) + (Number(retailTarget.pouches_target) || 0),
            sales: routeData.retail.sales,
            totalOutlets: outlets.retail,
            outletsWithOrders: routeData.retail.outlets.size
          }
        ];

        let totalPct = 0;
        types.forEach(type => {
          const outletPct = type.totalOutlets > 0 ? (type.outletsWithOrders / type.totalOutlets) * 100 : 0;
          const salesPct = type.target > 0 ? (type.sales / type.target) * 100 : 0;
          totalPct += (outletPct + salesPct) / 2;
        });

        const overall = totalPct / types.length;

        return {
          name: rep.name,
          overall: Number(overall.toFixed(1))
        };
      });

      // Sort and get top 10
      repPerformance.sort((a, b) => b.overall - a.overall);
      dashboardData.topReps = repPerformance.slice(0, 10);

      // Calculate average performance
      if (repPerformance.length > 0) {
        const avgPerf = repPerformance.reduce((sum, rep) => sum + rep.overall, 0) / repPerformance.length;
        dashboardData.stats.avgPerformance = Number(avgPerf.toFixed(1));
      }

      console.log('[getSalesDashboardData] Performance calculated for', repPerformance.length, 'reps');
    }

    // Process leaves
    if (leavesResult.status === 'fulfilled') {
      dashboardData.pendingLeavesCount = leavesResult.value[0][0].pending_count || 0;
      console.log('[getSalesDashboardData] Pending leaves:', dashboardData.pendingLeavesCount);
    }

    // Process managers
    if (managersResult.status === 'fulfilled') {
      dashboardData.managers = managersResult.value[0];
      console.log('[getSalesDashboardData] Managers found:', dashboardData.managers.length);
    }

    // Process planogram compliance data
    if (planogramComplianceResult.status === 'fulfilled') {
      const complianceData = planogramComplianceResult.value[0] || [];
      // Reverse to show oldest to newest
      dashboardData.planogramComplianceData = complianceData.reverse().map(row => ({
        month: row.month,
        compliance: Number(row.compliance_percentage) || 0
      }));
      console.log('[getSalesDashboardData] Planogram compliance data loaded:', dashboardData.planogramComplianceData.length, 'months');
    } else {
      console.log('[getSalesDashboardData] Planogram compliance query failed:', planogramComplianceResult.reason);
    }

    const endTime = Date.now();
    console.log(`[getSalesDashboardData] Completed in ${endTime - startTime}ms`);
    console.log('[getSalesDashboardData] Final stats being sent:', {
      totalActiveReps: dashboardData.stats.totalActiveReps,
      checkedInReps: dashboardData.stats.checkedInReps,
      activeReps: dashboardData.stats.activeReps
    });

    res.json({
      success: true,
      data: dashboardData,
      performanceMs: endTime - startTime
    });

  } catch (err) {
    console.error('[getSalesDashboardData] Error:', err);
    console.error('[getSalesDashboardData] Stack:', err.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch dashboard data',
      message: err.message 
    });
  }
};

/**
 * Get product performance data (lazy loaded)
 */
exports.getProductPerformance = async (req, res) => {
  try {
    console.log('[getProductPerformance] Starting...');
    const { productType, startDate, endDate } = req.query;

    let dateFilter = '';
    const params = [];

    if (startDate && endDate) {
      dateFilter = 'AND so.order_date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const typeFilter = productType ? 
      (productType === 'vape' ? 'AND p.category_id IN (1, 3)' : 'AND p.category_id IN (4, 5)') : '';

    const [products] = await db.query(`
      SELECT 
        p.id,
        p.product_name,
        p.category_id,
        SUM(soi.quantity) as total_quantity_sold,
        SUM(soi.quantity * soi.unit_price) as total_sales_value
      FROM products p
      LEFT JOIN sales_order_items soi ON p.id = soi.product_id
      LEFT JOIN sales_orders so ON soi.sales_order_id = so.id
      WHERE 1=1 ${dateFilter} ${typeFilter}
      GROUP BY p.id, p.product_name, p.category_id
      HAVING total_quantity_sold > 0
      ORDER BY total_sales_value DESC
    `, params);

    console.log('[getProductPerformance] Products found:', products.length);

    res.json({
      success: true,
      data: products
    });

  } catch (err) {
    console.error('[getProductPerformance] Error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch product performance',
      message: err.message 
    });
  }
};

/**
 * Get current month pie chart data (lazy loaded)
 */
exports.getCurrentMonthPieData = async (req, res) => {
  try {
    console.log('[getCurrentMonthPieData] Starting...');
    
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

    const [results] = await db.query(`
      SELECT 
        CASE 
          WHEN p.category_id IN (1, 3) THEN 'Vapes'
          WHEN p.category_id IN (4, 5) THEN 'Pouches'
          ELSE 'Other'
        END as product_type,
        SUM(soi.quantity * soi.unit_price) as total_value
      FROM sales_order_items soi
      JOIN sales_orders so ON soi.sales_order_id = so.id
      JOIN products p ON soi.product_id = p.id
      WHERE so.order_date BETWEEN ? AND ?
      GROUP BY product_type
      HAVING product_type IN ('Vapes', 'Pouches')
    `, [startDate, endDate]);

    console.log('[getCurrentMonthPieData] Data calculated');

    res.json({
      success: true,
      data: results.map(r => ({
        type: r.product_type,
        value: Number(r.total_value) || 0
      }))
    });

  } catch (err) {
    console.error('[getCurrentMonthPieData] Error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch pie chart data',
      message: err.message 
    });
  }
};

/**
 * Get outlets visited per month (lazy loaded)
 * Returns unique outlets visited per month from JourneyPlan where status = 1 or 2
 */
exports.getOutletsVisited = async (req, res) => {
  try {
    console.log('[getOutletsVisited] Starting...');
    
    const [results] = await db.query(`
      SELECT 
        DATE_FORMAT(jp.date, '%Y-%m') as month_key,
        DATE_FORMAT(jp.date, '%b %Y') as month,
        COUNT(DISTINCT jp.clientId) as unique_outlets
      FROM JourneyPlan jp
      WHERE jp.status IN (1, 2)
        AND jp.date IS NOT NULL
      GROUP BY DATE_FORMAT(jp.date, '%Y-%m'), DATE_FORMAT(jp.date, '%b %Y')
      ORDER BY month_key DESC
      LIMIT 12
    `);

    console.log('[getOutletsVisited] Outlets visited data calculated:', results.length, 'months');

    res.json({
      success: true,
      data: results.map(r => ({
        month: r.month,
        outlets: Number(r.unique_outlets) || 0
      })).reverse() // Reverse to show oldest to newest
    });

  } catch (err) {
    console.error('[getOutletsVisited] Error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch outlets visited data',
      message: err.message 
    });
  }
};

/**
 * Get orders summary per month (lazy loaded)
 * Returns total quantity from sales_order_items grouped by month
 */
exports.getOrdersSummary = async (req, res) => {
  try {
    console.log('[getOrdersSummary] Starting...');
    
    const [results] = await db.query(`
      SELECT 
        DATE_FORMAT(so.order_date, '%Y-%m') as month_key,
        DATE_FORMAT(so.order_date, '%b %Y') as month,
        SUM(soi.quantity) as total_quantity
      FROM sales_order_items soi
      JOIN sales_orders so ON soi.sales_order_id = so.id
      WHERE so.order_date IS NOT NULL
      GROUP BY DATE_FORMAT(so.order_date, '%Y-%m'), DATE_FORMAT(so.order_date, '%b %Y')
      ORDER BY month_key DESC
      LIMIT 12
    `);

    console.log('[getOrdersSummary] Orders summary data calculated:', results.length, 'months');

    res.json({
      success: true,
      data: results.map(r => ({
        month: r.month,
        quantity: Number(r.total_quantity) || 0
      })).reverse() // Reverse to show oldest to newest
    });

  } catch (err) {
    console.error('[getOrdersSummary] Error:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch orders summary data',
      message: err.message 
    });
  }
};

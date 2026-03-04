const db = require('../database/db');

/**
 * Helper function to ensure the planogram_compliance table exists
 */
async function ensureTableExists() {
  try {
    // Check if table exists
    const [tables] = await db.query("SHOW TABLES LIKE 'planogram_compliance'");
    
    if (tables.length === 0) {
      // Create the table
      await db.query(`
        CREATE TABLE IF NOT EXISTS planogram_compliance (
          id INT PRIMARY KEY AUTO_INCREMENT,
          outlet_account_id INT NOT NULL,
          product_id INT NOT NULL,
          compliance_quantity INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_outlet_product (outlet_account_id, product_id),
          INDEX idx_outlet_account (outlet_account_id),
          INDEX idx_product (product_id)
        )
      `);
      
      // Add foreign key constraints if tables exist
      try {
        // Check if outlet_accounts table exists
        const [outletTables] = await db.query("SHOW TABLES LIKE 'outlet_accounts'");
        if (outletTables.length > 0) {
          await db.query(`
            ALTER TABLE planogram_compliance
            ADD CONSTRAINT fk_pc_outlet_account 
            FOREIGN KEY (outlet_account_id) REFERENCES outlet_accounts(id) 
            ON DELETE CASCADE
          `);
        }
      } catch (fkErr) {
        // Foreign key might already exist or table doesn't exist, ignore
        if (!fkErr.message.includes('Duplicate foreign key') && !fkErr.message.includes('already exists')) {
          console.warn('Could not add outlet_accounts foreign key:', fkErr.message);
        }
      }
      
      try {
        // Check if products table exists
        const [productTables] = await db.query("SHOW TABLES LIKE 'products'");
        if (productTables.length > 0) {
          await db.query(`
            ALTER TABLE planogram_compliance
            ADD CONSTRAINT fk_pc_product 
            FOREIGN KEY (product_id) REFERENCES products(id) 
            ON DELETE CASCADE
          `);
        }
      } catch (fkErr) {
        // Foreign key might already exist or table doesn't exist, ignore
        if (!fkErr.message.includes('Duplicate foreign key') && !fkErr.message.includes('already exists')) {
          console.warn('Could not add products foreign key:', fkErr.message);
        }
      }
      
      console.log('Planogram compliance table created successfully');
    }
  } catch (err) {
    console.error('Error ensuring planogram_compliance table exists:', err);
    // Don't throw - let the actual query fail if table doesn't exist
  }
}

/**
 * Get all planogram compliance records for an outlet account
 */
exports.getPlanogramComplianceByOutletAccount = async (req, res) => {
  try {
    await ensureTableExists();
    
    const { outletAccountId } = req.params;
    
    const [compliance] = await db.query(`
      SELECT 
        pc.id,
        pc.outlet_account_id,
        pc.product_id,
        pc.compliance_quantity,
        p.product_name as product_name
      FROM planogram_compliance pc
      LEFT JOIN products p ON pc.product_id = p.id
      WHERE pc.outlet_account_id = ?
      ORDER BY p.product_name ASC
    `, [outletAccountId]);
    
    res.json({
      success: true,
      data: compliance
    });
  } catch (err) {
    console.error('Error fetching planogram compliance:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch planogram compliance',
      details: err.message 
    });
  }
};

/**
 * Create or update a planogram compliance record
 */
exports.setPlanogramCompliance = async (req, res) => {
  try {
    await ensureTableExists();
    
    const { outlet_account_id, product_id, compliance_quantity } = req.body;
    
    if (!outlet_account_id || !product_id || compliance_quantity === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Outlet account ID, product ID, and compliance quantity are required'
      });
    }
    
    if (compliance_quantity < 0) {
      return res.status(400).json({
        success: false,
        error: 'Compliance quantity must be greater than or equal to 0'
      });
    }
    
    // Check if compliance already exists
    const [existing] = await db.query(
      'SELECT id FROM planogram_compliance WHERE outlet_account_id = ? AND product_id = ?',
      [outlet_account_id, product_id]
    );
    
    if (existing.length > 0) {
      // Update existing compliance
      const [result] = await db.query(
        'UPDATE planogram_compliance SET compliance_quantity = ? WHERE id = ?',
        [compliance_quantity, existing[0].id]
      );
      
      const [updated] = await db.query(`
        SELECT 
          pc.id,
          pc.outlet_account_id,
          pc.product_id,
          pc.compliance_quantity,
          p.product_name as product_name
        FROM planogram_compliance pc
        LEFT JOIN products p ON pc.product_id = p.id
        WHERE pc.id = ?
      `, [existing[0].id]);
      
      res.json({
        success: true,
        message: 'Planogram compliance updated successfully',
        data: updated[0]
      });
    } else {
      // Create new compliance
      const [result] = await db.query(
        'INSERT INTO planogram_compliance (outlet_account_id, product_id, compliance_quantity) VALUES (?, ?, ?)',
        [outlet_account_id, product_id, compliance_quantity]
      );
      
      const [newCompliance] = await db.query(`
        SELECT 
          pc.id,
          pc.outlet_account_id,
          pc.product_id,
          pc.compliance_quantity,
          p.product_name as product_name
        FROM planogram_compliance pc
        LEFT JOIN products p ON pc.product_id = p.id
        WHERE pc.id = ?
      `, [result.insertId]);
      
      res.status(201).json({
        success: true,
        message: 'Planogram compliance created successfully',
        data: newCompliance[0]
      });
    }
  } catch (err) {
    console.error('Error setting planogram compliance:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to set planogram compliance',
      details: err.message 
    });
  }
};

/**
 * Delete a planogram compliance record
 */
exports.deletePlanogramCompliance = async (req, res) => {
  try {
    await ensureTableExists();
    
    const { id } = req.params;
    
    const [result] = await db.query(
      'DELETE FROM planogram_compliance WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: 'Planogram compliance record not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Planogram compliance deleted successfully'
    });
  } catch (err) {
    console.error('Error deleting planogram compliance:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete planogram compliance',
      details: err.message 
    });
  }
};

/**
 * Get planogram compliance report comparing targets with actual quantities from ProductReport
 */
exports.getPlanogramComplianceReport = async (req, res) => {
  try {
    await ensureTableExists();
    
    const { outletAccountId, startDate, endDate, page = 1, limit = 50, search } = req.query;
    const limitInt = parseInt(limit);
    const isViewAll = limitInt === -1;
    const offset = isViewAll ? 0 : (parseInt(page) - 1) * limitInt;
    
    let whereConditions = [];
    let params = [];
    let dateParams = [];
    
    // Filter by outlet account
    if (outletAccountId && outletAccountId !== 'all') {
      whereConditions.push('pc.outlet_account_id = ?');
      params.push(parseInt(outletAccountId));
    }
    
    // Date filter for ProductReport
    let productReportDateFilter = '';
    if (startDate && endDate) {
      productReportDateFilter = `AND DATE(pr.createdAt) BETWEEN ? AND ?`;
      dateParams.push(startDate, endDate);
    } else if (startDate) {
      productReportDateFilter = `AND DATE(pr.createdAt) >= ?`;
      dateParams.push(startDate);
    } else if (endDate) {
      productReportDateFilter = `AND DATE(pr.createdAt) <= ?`;
      dateParams.push(endDate);
    }
    
    // Search filter
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereConditions.push(`(p.product_name LIKE ? OR oa.name LIKE ?)`);
      params.push(searchTerm, searchTerm);
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';
    
    // Get total count (without date params)
    const [countResult] = await db.query(`
      SELECT COUNT(DISTINCT pc.id) as total
      FROM planogram_compliance pc
      LEFT JOIN outlet_accounts oa ON pc.outlet_account_id = oa.id
      LEFT JOIN products p ON pc.product_id = p.id
      ${whereClause}
    `, params);
    const total = countResult[0].total;
    
    // Main query: Get planogram compliance targets and compare with ProductReport quantities
    let query = `
      SELECT 
        pc.id,
        pc.outlet_account_id,
        pc.product_id,
        pc.compliance_quantity as target_quantity,
        oa.name as outlet_account_name,
        p.product_name,
        p.product_code,
        COALESCE(SUM(pr.quantity), 0) as actual_quantity,
        COUNT(DISTINCT pr.id) as report_count,
        MAX(pr.createdAt) as last_report_date
      FROM planogram_compliance pc
      LEFT JOIN outlet_accounts oa ON pc.outlet_account_id = oa.id
      LEFT JOIN products p ON pc.product_id = p.id
      LEFT JOIN Clients c ON c.outlet_account = pc.outlet_account_id
      LEFT JOIN ProductReport pr ON pr.clientId = c.id 
        AND pr.productId = pc.product_id
        ${productReportDateFilter}
      ${whereClause}
      GROUP BY pc.id, pc.outlet_account_id, pc.product_id, pc.compliance_quantity, oa.name, p.product_name, p.product_code
      ORDER BY oa.name ASC, p.product_name ASC
    `;
    
    // Combine params: where params, date params
    let mainParams = [...params, ...dateParams];
    
    // Add LIMIT and OFFSET only if not viewing all
    if (!isViewAll) {
      query += ` LIMIT ? OFFSET ?`;
      mainParams.push(limitInt, offset);
    }
    
    const [results] = await db.query(query, mainParams);
    
    res.json({
      success: true,
      data: results,
      pagination: {
        page: isViewAll ? 1 : parseInt(page),
        limit: isViewAll ? total : limitInt,
        total,
        totalPages: isViewAll ? 1 : Math.ceil(total / limitInt)
      }
    });
  } catch (err) {
    console.error('Error fetching planogram compliance report:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch planogram compliance report',
      details: err.message 
    });
  }
};

const express = require('express');
const router = express.Router();
const planogramComplianceController = require('../controllers/planogramComplianceController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get planogram compliance for an outlet account
router.get('/outlet-account/:outletAccountId', planogramComplianceController.getPlanogramComplianceByOutletAccount);

// Get planogram compliance report (comparing targets with ProductReport quantities)
router.get('/report', planogramComplianceController.getPlanogramComplianceReport);

// Create or update a planogram compliance record
router.post('/', planogramComplianceController.setPlanogramCompliance);

// Delete a planogram compliance record
router.delete('/:id', planogramComplianceController.deletePlanogramCompliance);

module.exports = router;

const express = require('express');
const router = express.Router();
const clientsVisitedController = require('../controllers/clientsVisitedController');

// Get all clients visited with optional filters
router.get('/', clientsVisitedController.getClientsVisited);

// Get clients visited summary statistics
router.get('/summary', clientsVisitedController.getClientsVisitedSummary);

module.exports = router;

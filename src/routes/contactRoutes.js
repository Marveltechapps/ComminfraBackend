const express = require('express');
const { 
  submitContactForm, 
  healthCheck 
} = require('../controllers/contactController');
const { validateContactForm } = require('../middleware/validationMiddleware');

const router = express.Router();

// Health check endpoint
router.get('/health', healthCheck);

// Contact form submission endpoint
router.post('/submit', validateContactForm, submitContactForm);

module.exports = router;
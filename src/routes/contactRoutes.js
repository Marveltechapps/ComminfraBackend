const express = require('express');
const { 
  submitContactForm, 
  submitDynamicContactFormQuery, 
  healthCheck 
} = require('../controllers/contactController');
const { validateContactForm, validateDynamicEmailFormQuery } = require('../middleware/validationMiddleware');

const router = express.Router();

// Health check endpoint
router.get('/health', healthCheck);

// Contact form submission endpoint (original - unchanged)
router.post('/submit', validateContactForm, submitContactForm);

// Dynamic email endpoint using query parameters
router.post('/submit-dynamic-query', validateDynamicEmailFormQuery, submitDynamicContactFormQuery);

module.exports = router;
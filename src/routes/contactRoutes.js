const express = require('express');
const { 
  submitContactForm, 
  healthCheck 
} = require('../controllers/contactController');
const { validateContactForm } = require('../middleware/validationMiddleware');

const router = express.Router();

// Wrap async handler to catch errors properly
// MUST be defined before routes that use it
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      // Ensure error is passed to error handler middleware
      next(err);
    });
  };
};

// Health check endpoint
router.get('/health', healthCheck);

// TEST endpoint - bypasses email sending (for debugging)
router.post('/submit-test', validateContactForm, asyncHandler(async (req, res) => {
  console.log('🧪 TEST MODE: Contact form received (email disabled)');
  console.log('📥 Request body:', req.body);
  
  return res.status(200).json({
    success: true,
    message: 'Test successful - email sending is disabled',
    receivedData: req.body,
    note: 'If you see this, the backend is working. The issue is likely email configuration.'
  });
}));

// Contact form submission endpoint
router.post('/submit', validateContactForm, asyncHandler(submitContactForm));

module.exports = router;
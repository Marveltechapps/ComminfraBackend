const Joi = require('joi');

// Stricter email validation function
const validateEmailFormat = (value, helpers) => {
  // Stricter email regex pattern
  const emailRegex = /^[a-zA-Z0-9]([a-zA-Z0-9._-]*[a-zA-Z0-9])?@[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(value)) {
    return helpers.error('string.email');
  }

  // Extract domain from email
  const domain = value.split('@')[1]?.toLowerCase();
  
  if (!domain) {
    return helpers.error('string.email');
  }

  // List of known fake/test/invalid domains to reject
  const invalidDomains = [
    'inspectgmail.com',
    'example.com',
    'test.com',
    'fake.com',
    'invalid.com',
    'testemail.com',
    'dummy.com',
    'sample.com',
    'mailinator.com',
    '10minutemail.com',
    'tempmail.com',
    'throwaway.email'
  ];

  // Check if domain is in invalid list
  if (invalidDomains.includes(domain)) {
    return helpers.error('string.emailInvalid');
  }

  // Check for valid TLD (Top Level Domain) - must be at least 2 characters
  const tld = domain.split('.').pop();
  if (!tld || tld.length < 2) {
    return helpers.error('string.email');
  }

  // Check domain structure - must have at least one dot (e.g., gmail.com)
  if (!domain.includes('.') || domain.split('.').length < 2) {
    return helpers.error('string.email');
  }

  // Check for consecutive dots or dots at start/end
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return helpers.error('string.email');
  }

  return value;
};

// Flexible validation - only email required, all other fields are optional and dynamic
const contactValidationSchema = Joi.object({
  email: Joi.string()
    .required()
    .custom(validateEmailFormat)
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Please provide a valid email address (e.g., user@gmail.com)',
      'string.emailInvalid': 'Invalid email domain. Please use a valid email address (e.g., gmail.com, yahoo.com, outlook.com)'
    })
}).unknown(true); // Allow any other fields to pass through without validation

const validateContactForm = (req, res, next) => {
  const { error } = contactValidationSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path[0],
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

module.exports = { 
  validateContactForm
};
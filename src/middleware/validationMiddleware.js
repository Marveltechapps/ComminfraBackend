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

// Flexible validation for dynamic emails - only validates email format, accepts any other fields
const validateDynamicEmailFormQuery = (req, res, next) => {
  // Only validate email format (required), all other fields are optional and dynamic
  const flexibleBodySchema = Joi.object({
    email: Joi.string()
      .required()
      .custom(validateEmailFormat)
      .messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address (e.g., user@gmail.com)',
        'string.emailInvalid': 'Invalid email domain. Please use a valid email address (e.g., gmail.com, yahoo.com, outlook.com)'
      })
  }).unknown(true); // Allow any other fields to pass through without validation
  
  // Validate query parameters (recipientEmail, senderEmail, googleSheetLink, webhookUrl)
  const querySchema = Joi.object({
    recipientEmail: Joi.string()
      .optional()
      .allow('')
      .custom((value, helpers) => {
        if (!value || value === '') return value; // Allow empty
        return validateEmailFormat(value, helpers);
      })
      .messages({
        'string.email': 'Recipient email must be a valid email address (e.g., user@gmail.com)',
        'string.emailInvalid': 'Invalid recipient email domain. Please use a valid email address'
      }),
    senderEmail: Joi.string()
      .optional()
      .allow('')
      .custom((value, helpers) => {
        if (!value || value === '') return value; // Allow empty
        return validateEmailFormat(value, helpers);
      })
      .messages({
        'string.email': 'Sender email must be a valid email address (e.g., user@gmail.com)',
        'string.emailInvalid': 'Invalid sender email domain. Please use a valid email address'
      }),
    googleSheetLink: Joi.string()
      .optional()
      .allow('')
      .uri()
      .custom((value, helpers) => {
        if (!value || value === '') return value; // Allow empty
        // Validate Google Sheets URL format
        const googleSheetsPattern = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+/;
        if (!googleSheetsPattern.test(value)) {
          return helpers.error('string.googleSheetsUrl');
        }
        return value;
      })
      .messages({
        'string.uri': 'Google Sheets link must be a valid URL',
        'string.googleSheetsUrl': 'Google Sheets link must be a valid Google Sheets URL (e.g., https://docs.google.com/spreadsheets/d/.../edit)'
      }),
    webhookUrl: Joi.string()
      .optional()
      .allow('')
      .uri()
      .messages({
        'string.uri': 'Webhook URL must be a valid URL'
      })
  });

  const bodyValidation = flexibleBodySchema.validate(req.body, { abortEarly: false });
  const queryValidation = querySchema.validate(req.query, { abortEarly: false });

  // Combine errors from both body and query
  const errors = [];
  
  if (bodyValidation.error) {
    errors.push(...bodyValidation.error.details.map(detail => ({
      field: detail.path[0],
      message: detail.message,
      source: 'body'
    })));
  }

  if (queryValidation.error) {
    errors.push(...queryValidation.error.details.map(detail => ({
      field: detail.path[0],
      message: detail.message,
      source: 'query'
    })));
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

module.exports = { 
  validateContactForm,
  validateDynamicEmailFormQuery
};
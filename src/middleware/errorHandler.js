const errorHandler = (err, req, res, next) => {
  // Prevent double response sending
  if (res.headersSent) {
    console.warn('⚠️ Response already sent, delegating to Express default error handler');
    return next(err);
  }

  // Enhanced error logging
  console.error('\n❌ ========== GLOBAL ERROR HANDLER ==========');
  console.error('❌ Error message:', err.message);
  console.error('❌ Error code:', err.code || 'NO_CODE');
  console.error('❌ Error type:', err.constructor.name);
  console.error('❌ Error name:', err.name);
  if (err.stack) {
    console.error('❌ Stack trace:');
    console.error(err.stack);
  }
  if (err.cause) {
    console.error('❌ Caused by:', err.cause?.message);
    if (err.cause?.code) console.error('❌ Cause code:', err.cause.code);
    if (err.cause?.stack) {
      console.error('❌ Cause stack:', err.cause.stack);
    }
  }
  console.error('❌ =========================================\n');

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: err.errors
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid data format'
    });
  }

  // Check for email-related errors
  const emailErrorCodes = [
    'EMAIL_CONFIG_MISSING',
    'EMAIL_SEND_FAILED',
    'EMAIL_TIMEOUT',
    'EMAIL_CONNECTION_FAILED',
    'EMAIL_AUTH_FAILED'
  ];
  const isEmailError = emailErrorCodes.includes(err.code) || 
                       err.message?.toLowerCase().includes('smtp') || 
                       err.message?.toLowerCase().includes('email');
  
  // Check for body parser errors
  const isBodyParserError = err.code === 'BODY_PARSER_ERROR' || 
                           err.message?.toLowerCase().includes('request body') ||
                           err.message?.toLowerCase().includes('body is missing');
  
  const status = isBodyParserError ? 400 : (isEmailError ? 503 : (err.status || err.statusCode || 500));
  
  // Build error response with details
  const errorMsg = err.message || '';
  const causeMsg = err.cause?.message || '';
  const fullError = (errorMsg + ' ' + causeMsg).toLowerCase();
  
  let message = err.message || 'Internal Server Error';
  let errorDetails = err.message || 'Unknown error occurred';
  
  // Handle body parser errors
  if (isBodyParserError) {
    message = 'Request body is missing or invalid';
    errorDetails = err.message || 'The request body could not be parsed. Please ensure Content-Type is application/json.';
  } else if (err.code === 'EMAIL_CONFIG_MISSING') {
    message = 'Email service not configured. Please contact support.';
    errorDetails = err.message;
  } else if (err.code === 'EMAIL_TIMEOUT') {
    message = 'Email service timeout. The server took too long to respond.';
    errorDetails = err.message || 'Email send operation timed out';
  } else if (err.code === 'EMAIL_CONNECTION_FAILED') {
    message = 'Cannot connect to email server. Please check server configuration.';
    errorDetails = err.message || 'SMTP connection failed';
  } else if (err.code === 'EMAIL_AUTH_FAILED') {
    message = 'Email authentication failed. Please check email credentials.';
    errorDetails = err.message || 'SMTP authentication failed';
  } else if (err.code === 'EMAIL_SEND_FAILED' || isEmailError) {
    if (fullError.includes('invalid login') || fullError.includes('authentication') || fullError.includes('535') || fullError.includes('eauth')) {
      message = 'Email authentication failed. Please check email credentials (use App Password for Gmail).';
      errorDetails = 'SMTP authentication error: ' + (causeMsg || errorMsg);
    } else if (fullError.includes('econnrefused') || fullError.includes('enotfound') || fullError.includes('timeout') || fullError.includes('connection')) {
      message = 'Cannot connect to email server. Please check EMAIL_HOST and EMAIL_PORT settings.';
      errorDetails = 'SMTP connection error: ' + (causeMsg || errorMsg);
    } else {
      message = 'Email service error. Please try again later.';
      errorDetails = causeMsg || errorMsg || 'Unknown email error';
    }
  }
  
  const response = {
    success: false,
    message,
    error: errorDetails
  };
  
  // Always include error code if available
  if (err.code) {
    response.errorCode = err.code;
  }
  
  // In development, include debug info
  if (process.env.NODE_ENV === 'development') {
    response.debug = {
      errorMessage: err.message,
      errorCode: err.code,
      errorType: err.constructor.name,
      errorName: err.name,
      causeMessage: err.cause?.message,
      causeCode: err.cause?.code,
      stack: err.stack
    };
  }

  res.status(status).json(response);
};

module.exports = errorHandler;
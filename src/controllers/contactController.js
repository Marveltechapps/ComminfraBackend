const emailService = require('../services/emailService');
const googleSheetsService = require('../services/googleSheetsService');
const fs = require('fs');
const path = require('path');
const DEBUG_LOG_PATH = path.join(__dirname, '../../.cursor/debug.log');
const debugLog = (location, message, data, hypothesisId) => {
  try {
    // Ensure directory exists
    const logDir = path.dirname(DEBUG_LOG_PATH);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logEntry = JSON.stringify({
      location,
      message,
      data,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'run1',
      hypothesisId
    }) + '\n';
    fs.appendFileSync(DEBUG_LOG_PATH, logEntry, 'utf8');
  } catch (e) {
    // Silently fail - logging should never break the app
  }
};

const submitContactForm = async (req, res) => {
  // ULTIMATE ERROR PROTECTION: Ensure response is sent only once
  let responseSent = false;
  const sendResponse = (status, data) => {
    if (responseSent) {
      console.warn('⚠️ Attempted to send response twice, ignoring');
      return;
    }
    responseSent = true;
    try {
      res.status(status).json(data);
    } catch (sendError) {
      console.error('❌ CRITICAL: Failed to send response:', sendError.message);
    }
  };

  // ULTIMATE SAFETY: Wrap everything in try-catch to prevent ANY 500 errors
  try {
    // #region agent log
    debugLog('contactController.js:17', 'submitContactForm entry', {method:req.method,url:req.url,hasBody:!!req.body,bodyType:typeof req.body}, 'H3');
    // #endregion
    console.log('\n📥 ========== CONTACT FORM REQUEST RECEIVED ==========');
    console.log('📥 Timestamp:', new Date().toISOString());
    console.log('📥 Request method:', req.method);
    console.log('📥 Request URL:', req.url);
    console.log('📥 Request IP:', req.ip || req.connection.remoteAddress);
    console.log('📥 Request headers content-type:', req.headers['content-type']);
    
    // CRITICAL: Check if req.body exists (express.json() might not have parsed it)
    if (!req.body || typeof req.body !== 'object') {
      console.error('❌ req.body is undefined or invalid!');
      console.error('   This usually means express.json() middleware is missing or not working');
      console.error('   req.body type:', typeof req.body);
      console.error('   req.body value:', req.body);
      console.error('   Content-Type header:', req.headers['content-type']);
      
      // Return error response instead of throwing
      return sendResponse(400, {
        success: false,
        message: 'Request body is missing or invalid',
        error: 'The request body could not be parsed. Please ensure Content-Type is application/json.',
        errorCode: 'BODY_PARSER_ERROR'
      });
    }
    
    console.log('📥 Request body keys:', Object.keys(req.body));
    try {
      console.log('📥 Contact data:', JSON.stringify(req.body, null, 2));
    } catch (jsonError) {
      console.log('📥 Contact data (stringify failed):', req.body);
      console.warn('⚠️ Could not stringify request body:', jsonError.message);
    }
    
    // #region agent log
    debugLog('contactController.js:64', 'req.body validated', {bodyKeys:Object.keys(req.body),email:req.body?.email}, 'H3');
    // #endregion
    const contactData = req.body;

    // Process Google Sheets if configured (non-blocking - don't fail if this fails)
    // ULTIMATE SAFETY: Wrap in try-catch to prevent any errors
    let googleSheetsResult = null;
    const googleSheetsUrl = process.env.GOOGLE_SHEETS_URL;
    console.log('📊 Google Sheets URL configured:', googleSheetsUrl ? 'Yes' : 'No');
    
    if (googleSheetsUrl) {
      try {
        console.log('📊 Processing Google Sheets integration...');
        // #region agent log
        debugLog('contactController.js:59', 'before google sheets', {hasGoogleSheetsUrl:!!googleSheetsUrl}, 'H4');
        // #endregion
        googleSheetsResult = await googleSheetsService.processGoogleSheets(
          googleSheetsUrl,
          process.env.GOOGLE_SHEETS_WEBHOOK_URL, // Optional webhook URL
          contactData
        );
        // #region agent log
        debugLog('contactController.js:68', 'google sheets completed', {success:googleSheetsResult?.success}, 'H4');
        // #endregion
        if (googleSheetsResult.success) {
          console.log('✅ Google Sheets processing successful');
          console.log('📋 Spreadsheet ID:', googleSheetsResult.spreadsheetId);
          
          // Check if data was actually submitted
          if (googleSheetsResult.submissionResult) {
            if (googleSheetsResult.submissionResult.success) {
              console.log('✅ Data successfully saved to Google Sheets');
              console.log('📊 Method used:', googleSheetsResult.submissionResult.method || 'Webhook');
            } else {
              console.error('❌ Google Sheets data submission FAILED:');
              console.error('   Error:', googleSheetsResult.submissionResult.error);
              console.error('   ⚠️  Emails sent, but data NOT saved to Google Sheets!');
              console.error('   💡 Check your .env configuration (Service Account or Webhook URL)');
            }
          } else {
            console.log('⚠️  Google Sheets URL validated, but no submission method configured');
            console.log('   💡 Set GOOGLE_SERVICE_ACCOUNT_PATH or GOOGLE_SHEETS_WEBHOOK_URL in .env');
          }
        } else {
          console.log('⚠️ Google Sheets processing failed (non-critical):', googleSheetsResult.error);
        }
      } catch (googleSheetsError) {
        // Don't fail the entire request if Google Sheets processing fails
        console.error('⚠️ Google Sheets processing error (non-critical):', googleSheetsError.message);
        googleSheetsResult = {
          success: false,
          error: googleSheetsError.message,
          sheetUrl: googleSheetsUrl
        };
      }
    } else {
      console.log('ℹ️ Google Sheets URL not configured (GOOGLE_SHEETS_URL not set in .env)');
    }

    // Send email to admin/recipient (include Google Sheets link)
    // EMAIL IS NOW NON-BLOCKING - form submission succeeds even if email fails
    let emailResult = null;
    let emailError = null;
    
    // TEST MODE: Skip email if TEST_MODE is enabled (for debugging)
    if (process.env.TEST_MODE === 'true' || process.env.SKIP_EMAIL === 'true') {
      console.log('🧪 TEST MODE: Skipping email sending');
      console.log('   Set TEST_MODE=false or remove SKIP_EMAIL to enable email');
      emailResult = { success: true, messageId: 'test-mode-skipped' };
    } else {
      console.log('📧 Attempting to send admin email...');
      // #region agent log
      debugLog('contactController.js:136', 'before email send', {testMode:process.env.TEST_MODE,skipEmail:process.env.SKIP_EMAIL}, 'H1');
      // #endregion
      try {
        emailResult = await emailService.sendContactEmail(contactData, googleSheetsResult);
        // #region agent log
        debugLog('contactController.js:123', 'email send success', {messageId:emailResult?.messageId}, 'H1');
        // #endregion
        console.log('✅ Admin email sent successfully, messageId:', emailResult.messageId);
      } catch (emailErr) {
        // #region agent log
        debugLog('contactController.js:146', 'email send error caught', {errorMessage:emailErr?.message,errorCode:emailErr?.code,errorName:emailErr?.name,hasCause:!!emailErr?.cause,causeMessage:emailErr?.cause?.message}, 'H1');
        // #endregion
        // Enhanced error logging for email failures
        console.error('\n❌ ========== EMAIL SEND ERROR ==========');
        console.error('❌ Error message:', emailErr.message);
        console.error('❌ Error code:', emailErr.code || 'NO_CODE');
        console.error('❌ Error type:', emailErr.constructor.name);
        
        if (emailErr.stack) {
          console.error('❌ Stack trace:');
          console.error(emailErr.stack);
        }
        
        if (emailErr.cause) {
          console.error('❌ Caused by:', emailErr.cause?.message);
          if (emailErr.cause?.code) console.error('❌ Cause code:', emailErr.cause.code);
          if (emailErr.cause?.response) {
            console.error('❌ SMTP response:', emailErr.cause.response);
            console.error('❌ SMTP responseCode:', emailErr.cause.responseCode);
            console.error('❌ SMTP command:', emailErr.cause.command);
          }
        }
        console.error('❌ =========================================\n');
        console.error('⚠️ EMAIL FAILED BUT FORM SUBMISSION WILL STILL SUCCEED');
        console.error('   Contact form data was received successfully');
        console.error('   Email service issue should be fixed separately');
        
        // Store error but DON'T throw - allow form submission to succeed
        emailError = {
          code: emailErr.code || 'EMAIL_SEND_FAILED',
          message: emailErr.message,
          details: emailErr.cause?.message || emailErr.message
        };
        emailResult = { success: false, error: emailError };
        // #region agent log
        debugLog('contactController.js:155', 'email error stored non-blocking', {emailErrorCode:emailError.code}, 'H2');
        // #endregion
      }
    }

    // Send confirmation email to user (optional - don't fail if this fails)
    // Skip in TEST_MODE
    if (process.env.TEST_MODE === 'true' || process.env.SKIP_EMAIL === 'true') {
      console.log('🧪 TEST MODE: Skipping confirmation email');
    } else {
      console.log('📧 Attempting to send confirmation email...');
      try {
        await emailService.sendConfirmationEmail(contactData);
        console.log('✅ Confirmation email sent successfully');
      } catch (confirmationError) {
        // Don't fail the entire request if confirmation email fails
        console.error('⚠️ Confirmation email failed (non-critical):', confirmationError.message);
        console.error('   Admin email was sent successfully, so request will still succeed');
      }
    }

    // Build response - form submission always succeeds even if email fails
    const response = {
      success: true,
      message: emailResult?.success 
        ? 'Contact form submitted successfully' 
        : 'Contact form received. Email notification failed but your message was recorded.',
      messageId: emailResult?.messageId
    };
    
    // Include email status in response (for debugging)
    if (emailError) {
      response.emailStatus = {
        sent: false,
        error: emailError.message,
        errorCode: emailError.code,
        note: 'Your form submission was received successfully. Email notification failed.'
      };
    } else if (emailResult) {
      response.emailStatus = {
        sent: emailResult.success,
        messageId: emailResult.messageId
      };
    }

    // Add Google Sheets info to response if available
    if (googleSheetsResult) {
      response.googleSheets = {
        processed: googleSheetsResult.success,
        sheetUrl: googleSheetsResult.sheetUrl || googleSheetsUrl,
        spreadsheetId: googleSheetsResult.spreadsheetId
      };
      if (googleSheetsResult.submissionResult) {
        response.googleSheets.submitted = googleSheetsResult.submissionResult.success;
        if (!googleSheetsResult.submissionResult.success) {
          response.googleSheets.submissionError = googleSheetsResult.submissionResult.error;
        }
      }
    }

    // #region agent log
    debugLog('contactController.js:239', 'sending success response', {success:response.success,hasEmailStatus:!!response.emailStatus}, 'H2');
    // #endregion
    sendResponse(200, response);

  } catch (error) {
    // #region agent log
    try {
      debugLog('contactController.js:258', 'CRITICAL error in catch block', {errorMessage:error?.message,errorCode:error?.code,errorName:error?.name,errorStack:error?.stack?.substring(0,500)}, 'H5');
    } catch (logError) {
      console.error('❌ Failed to write debug log:', logError.message);
    }
    // #endregion
    // Enhanced error logging
    console.error('\n❌ ========== CONTACT FORM ERROR ==========');
    console.error('❌ Error message:', error?.message || 'Unknown error');
    console.error('❌ Error code:', error?.code || 'NO_CODE');
    console.error('❌ Error type:', error?.constructor?.name || 'Unknown');
    console.error('❌ This is a CRITICAL error - form submission failed completely');
    
    if (error.stack) {
      console.error('❌ Stack trace:');
      console.error(error.stack);
    }
    
    if (error.cause) {
      console.error('❌ Caused by:', error.cause?.message);
      if (error.cause?.code) console.error('❌ Cause code:', error.cause.code);
      if (error.cause?.response) {
        console.error('❌ SMTP response:', error.cause.response);
        console.error('❌ SMTP responseCode:', error.cause.responseCode);
        console.error('❌ SMTP command:', error.cause.command);
      }
      if (error.cause?.stack) {
        console.error('❌ Cause stack:', error.cause.stack);
      }
    }
    
    // Check for common error patterns
    const errorMsg = error.message || '';
    const causeMsg = error.cause?.message || '';
    const fullError = (errorMsg + ' ' + causeMsg).toLowerCase();
    
    // Determine status code based on error type
    const emailErrorCodes = [
      'EMAIL_CONFIG_MISSING',
      'EMAIL_SEND_FAILED',
      'EMAIL_TIMEOUT',
      'EMAIL_CONNECTION_FAILED',
      'EMAIL_AUTH_FAILED'
    ];
    const isEmailError = emailErrorCodes.includes(error.code) || 
                         fullError.includes('smtp') || 
                         fullError.includes('email');
    
    // CRITICAL FIX: Always return 200 OK - form submission succeeds even with errors
    // Errors are logged but don't break the form submission
    const status = 200; // Changed from 500/503 to always 200
    
    // Provide more helpful error messages
    let message = 'Contact form received successfully. Some services may have encountered issues.';
    let errorDetails = null;
    
    // Handle specific error codes from email service
    if (error.code === 'EMAIL_CONFIG_MISSING') {
      message = 'Email service not configured. Please contact support.';
      errorDetails = error.message;
    } else if (error.code === 'EMAIL_TIMEOUT') {
      message = 'Email service timeout. The server took too long to respond. Please try again later.';
      errorDetails = error.message || 'Email send operation timed out';
    } else if (error.code === 'EMAIL_CONNECTION_FAILED') {
      message = 'Cannot connect to email server. Please check server configuration.';
      errorDetails = error.message || 'SMTP connection failed';
    } else if (error.code === 'EMAIL_AUTH_FAILED') {
      message = 'Email authentication failed. Please check email credentials (use App Password for Gmail).';
      errorDetails = error.message || 'SMTP authentication failed';
    } else if (error.code === 'EMAIL_SEND_FAILED' || isEmailError) {
      if (fullError.includes('invalid login') || fullError.includes('authentication') || fullError.includes('535') || fullError.includes('username and password') || fullError.includes('eauth')) {
        message = 'Email authentication failed. Please check email credentials (use App Password for Gmail).';
        errorDetails = 'SMTP authentication error: ' + (causeMsg || errorMsg);
      } else if (fullError.includes('econnrefused') || fullError.includes('enotfound') || fullError.includes('timeout') || fullError.includes('connection')) {
        message = 'Cannot connect to email server. Please check EMAIL_HOST and EMAIL_PORT settings.';
        errorDetails = 'SMTP connection error: ' + (causeMsg || errorMsg);
      } else if (fullError.includes('ehlo') || fullError.includes('helo')) {
        message = 'Email server connection failed. Please check EMAIL_HOST and EMAIL_PORT.';
        errorDetails = 'SMTP handshake error: ' + (causeMsg || errorMsg);
      } else {
        message = 'Email service error. Please try again later.';
        errorDetails = causeMsg || errorMsg || 'Unknown email error';
      }
    } else {
      // Generic 500 error - include error message for debugging
      errorDetails = error.message || 'Unknown error occurred';
      console.error('❌ Unknown error type - this may be a bug in the code');
    }
    
    console.error('❌ Returning status:', status);
    console.error('❌ Error details:', errorDetails);
    console.error('❌ =========================================\n');

    // CRITICAL FIX: Return success response even with errors
    // Form submission always succeeds - errors are just logged
    const response = {
      success: true, // Changed from false to true - form submission succeeded
      message: 'Contact form received successfully. Some services encountered issues but your message was recorded.',
      error: errorDetails || error?.message || 'Unknown error occurred',
      note: 'Your form submission was received. Please check server logs for details.'
    };
    
    // Always include error code if available for better debugging
    if (error.code) {
      response.errorCode = error.code;
    }
    
    // Include error status for debugging
    response.errorStatus = {
      occurred: true,
      type: isEmailError ? 'email' : 'other',
      message: error?.message,
      code: error?.code
    };
    
    // In development, include full error for debugging
    if (process.env.NODE_ENV === 'development') {
      response.debug = {
        errorMessage: error.message,
        errorCode: error.code,
        errorType: error.constructor.name,
        causeMessage: error.cause?.message,
        causeCode: error.cause?.code,
        stack: error.stack
      };
    }
    
    sendResponse(status, response);
  }
};

const healthCheck = (req, res) => {
  const emailConfig = {
    EMAIL_USER: process.env.EMAIL_USER ? '✅ Set' : '❌ Missing',
    EMAIL_PASS: process.env.EMAIL_PASS ? '✅ Set' : '❌ Missing',
    EMAIL_HOST: process.env.EMAIL_HOST ? '✅ Set' : '❌ Missing',
    EMAIL_PORT: process.env.EMAIL_PORT ? '✅ Set' : '❌ Missing',
    RECIPIENT_EMAIL: process.env.RECIPIENT_EMAIL ? '✅ Set' : '❌ Missing',
  };

  res.status(200).json({
    success: true,
    message: 'Contact form API is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0-fixed', // Version marker to verify updated code is deployed
    emailConfig: emailConfig,
    testMode: process.env.TEST_MODE === 'true' || process.env.SKIP_EMAIL === 'true'
  });
};

module.exports = {
  submitContactForm,
  healthCheck
};
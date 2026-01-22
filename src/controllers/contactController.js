const emailService = require('../services/emailService');
const googleSheetsService = require('../services/googleSheetsService');

const submitContactForm = async (req, res) => {
  try {
    const contactData = req.body;

    // Process Google Sheets if configured (non-blocking - don't fail if this fails)
    let googleSheetsResult = null;
    const googleSheetsUrl = process.env.GOOGLE_SHEETS_URL;
    
    if (googleSheetsUrl) {
      try {
        console.log('📊 Processing Google Sheets integration...');
        googleSheetsResult = await googleSheetsService.processGoogleSheets(
          googleSheetsUrl,
          process.env.GOOGLE_SHEETS_WEBHOOK_URL, // Optional webhook URL
          contactData
        );
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
    const emailResult = await emailService.sendContactEmail(contactData, googleSheetsResult);

    // Send confirmation email to user (optional)
    await emailService.sendConfirmationEmail(contactData);

    // Build response
    const response = {
      success: true,
      message: 'Contact form submitted successfully',
      messageId: emailResult.messageId
    };

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

    res.status(200).json(response);

  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later.'
    });
  }
};

const healthCheck = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Contact form API is running',
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  submitContactForm,
  healthCheck
};
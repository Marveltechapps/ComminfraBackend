const emailService = require('../services/emailService');
const googleSheetsService = require('../services/googleSheetsService');

const submitContactForm = async (req, res) => {
  try {
    const contactData = req.body;

    // Send email to admin/recipient
    const emailResult = await emailService.sendContactEmail(contactData);

    // Send confirmation email to user (optional)
    await emailService.sendConfirmationEmail(contactData);

    res.status(200).json({
      success: true,
      message: 'Contact form submitted successfully',
      messageId: emailResult.messageId
    });

  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later.'
    });
  }
};

// New controller: Handle dynamic emails from query parameters
const submitDynamicContactFormQuery = async (req, res) => {
  try {
    const contactData = req.body;  // All dynamic fields from user
    const queryParams = req.query;  // recipientEmail, senderEmail, googleSheetLink, webhookUrl

    // Send email to admin/recipient (from query)
    const emailResult = await emailService.sendDynamicContactEmailFromQuery(contactData, queryParams);

    // Send confirmation email to user (from query)
    await emailService.sendDynamicConfirmationEmailFromQuery(contactData, queryParams);

    // Process Google Sheets if link is provided (non-blocking - don't fail if this fails)
    let googleSheetsResult = null;
    if (queryParams.googleSheetLink) {
      try {
        googleSheetsResult = await googleSheetsService.processGoogleSheets(
          queryParams.googleSheetLink,
          queryParams.webhookUrl, // Optional webhook URL for writing data
          contactData
        );
        if (googleSheetsResult.success) {
          console.log('✅ Google Sheets processing successful');
        } else {
          console.log('⚠️ Google Sheets processing failed (non-critical):', googleSheetsResult.error);
        }
      } catch (googleSheetsError) {
        // Don't fail the entire request if Google Sheets processing fails
        console.error('⚠️ Google Sheets processing error (non-critical):', googleSheetsError.message);
        googleSheetsResult = {
          success: false,
          error: googleSheetsError.message
        };
      }
    }

    // Build response
    const response = {
      success: true,
      message: 'Contact form submitted successfully with dynamic emails from query',
      messageId: emailResult.messageId,
      recipientEmail: emailResult.recipientEmail,
      senderEmail: queryParams.senderEmail || process.env.EMAIL_USER
    };

    // Add Google Sheets result if available
    if (googleSheetsResult) {
      response.googleSheets = {
        processed: googleSheetsResult.success,
        sheetLink: queryParams.googleSheetLink,
        spreadsheetId: googleSheetsResult.spreadsheetId
      };
      if (!googleSheetsResult.success) {
        response.googleSheets.error = googleSheetsResult.error;
      }
      if (googleSheetsResult.submissionResult) {
        response.googleSheets.submitted = googleSheetsResult.submissionResult.success;
        if (!googleSheetsResult.submissionResult.success) {
          response.googleSheets.submissionError = googleSheetsResult.submissionResult.error;
        }
      }
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('Dynamic contact form submission error (query):', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later.',
      error: error.message
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
  submitDynamicContactFormQuery,
  healthCheck
};
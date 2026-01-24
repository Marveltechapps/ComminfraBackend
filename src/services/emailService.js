const { createTransporter } = require('../config/emailConfig');
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

class EmailService {
  constructor() {
    this._transporter = null; // Lazy initialization
  }

  // Get transporter (lazy initialization - created when first needed)
  get transporter() {
    if (!this._transporter) {
      console.log('📧 Initializing email transporter...');
      // Validate config before creating transporter
      this._validateEmailConfig();
      // Create transporter (will throw if config is missing)
      try {
        this._transporter = createTransporter();
        console.log('✅ Email transporter created successfully');
      } catch (error) {
        console.error('❌ Failed to create email transporter:', error.message);
        throw error; // Re-throw so it's caught by the calling function
      }
    }
    return this._transporter;
  }

  _validateEmailConfig() {
    const missing = [];
    if (!process.env.EMAIL_USER) missing.push('EMAIL_USER');
    if (!process.env.EMAIL_PASS) missing.push('EMAIL_PASS');
    if (!process.env.RECIPIENT_EMAIL) missing.push('RECIPIENT_EMAIL');
    if (!process.env.EMAIL_HOST) missing.push('EMAIL_HOST');
    if (!process.env.EMAIL_PORT) missing.push('EMAIL_PORT');
    if (missing.length) {
      const err = new Error(`Email not configured: set ${missing.join(', ')} in backend .env`);
      err.code = 'EMAIL_CONFIG_MISSING';
      throw err;
    }
  }

  async sendContactEmail(contactData, googleSheetsResult = null) {
    // #region agent log
    debugLog('emailService.js:40', 'sendContactEmail entry', {hasContactData:!!contactData,email:contactData?.email}, 'H1');
    // #endregion
    console.log('📧 [sendContactEmail] Starting...');
    console.log('📧 [sendContactEmail] Validating email config...');
    
    // Validate config first (will throw if missing)
    this._validateEmailConfig();
    // #region agent log
    debugLog('emailService.js:46', 'email config validated', {emailHost:process.env.EMAIL_HOST,hasEmailUser:!!process.env.EMAIL_USER}, 'H1');
    // #endregion
    console.log('✅ [sendContactEmail] Email config validated');
    
    // Ensure transporter is initialized (will throw if config missing)
    console.log('📧 [sendContactEmail] Getting transporter...');
    const transporter = this.transporter;
    // #region agent log
    debugLog('emailService.js:73', 'transporter obtained', {hasTransporter:!!transporter}, 'H1');
    // #endregion
    console.log('✅ [sendContactEmail] Transporter obtained');
    
    const { email } = contactData;
    console.log('📧 [sendContactEmail] User email:', email);

    console.log('📧 Sending admin email to:', process.env.RECIPIENT_EMAIL);
    console.log('📧 Dynamic fields received:', Object.keys(contactData).join(', '));

    // Extract name for "From" field (try multiple common field names)
    const displayName = contactData.name || contactData.fullName || contactData.customerName || 'Contact Form User';

    // Build dynamic fields HTML - exclude email as it's shown separately
    const dynamicFieldsHtml = Object.keys(contactData)
      .filter(key => key !== 'email' && contactData[key] !== null && contactData[key] !== undefined && contactData[key] !== '')
      .map(key => {
        const fieldLabel = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
        const fieldValue = typeof contactData[key] === 'string' 
          ? contactData[key].replace(/\n/g, '<br>') 
          : JSON.stringify(contactData[key]);
        return `<p><strong>${fieldLabel}:</strong> ${fieldValue}</p>`;
      })
      .join('');

    // Build Google Sheets link section if available
    let googleSheetsSection = '';
    if (googleSheetsResult && googleSheetsResult.sheetUrl) {
      const sheetStatus = googleSheetsResult.submissionResult?.success 
        ? '✅ Data saved successfully' 
        : googleSheetsResult.submissionResult?.error 
          ? `⚠️ Link available but save failed: ${googleSheetsResult.submissionResult.error}`
          : '📊 Link available';
      
      // Build list of saved fields for display
      const savedFieldsList = Object.keys(contactData)
        .filter(key => contactData[key] !== null && contactData[key] !== undefined && contactData[key] !== '')
        .map(key => {
          const fieldLabel = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
          return `<li><strong>${fieldLabel}:</strong> ${contactData[key]}</li>`;
        })
        .join('');
      
      googleSheetsSection = `
        <div style="background-color: #e3f2fd; padding: 20px; border-radius: 5px; margin-top: 20px; border-left: 4px solid #2196F3;">
          <h3 style="color: #1976D2; margin-top: 0; margin-bottom: 15px;">📊 Google Sheets - Data Saved</h3>
          <p style="margin: 5px 0 10px 0;"><strong>Status:</strong> ${sheetStatus}</p>
          <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">📋 Saved Data:</p>
            <ul style="margin: 0; padding-left: 20px; color: #555;">
              ${savedFieldsList}
              <li><strong>Timestamp:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          <p style="margin: 15px 0 5px 0;">
            <strong>View in Google Sheets:</strong>
          </p>
          <a href="${googleSheetsResult.sheetUrl}" 
             style="display: inline-block; padding: 10px 20px; background-color: #1976D2; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 5px;" 
             target="_blank">
            📊 Open Google Sheet
          </a>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #666; word-break: break-all;">
            ${googleSheetsResult.sheetUrl}
          </p>
        </div>
      `;
    }

    // Add EMAIL_USER as CC to regular contact email (if different from recipient)
    const mailOptions = {
      from: `"${displayName}" <${process.env.EMAIL_USER}>`,
      to: process.env.RECIPIENT_EMAIL,
      subject: `Contact Form: ${contactData.subject || contactData.inquiryType || 'New Submission'}`,
      // Add EMAIL_USER as CC if different from recipient
      ...(process.env.EMAIL_USER && process.env.EMAIL_USER !== process.env.RECIPIENT_EMAIL && { cc: process.env.EMAIL_USER }),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Contact Form Submission</h2>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px;">
            <p><strong>Email:</strong> ${email}</p>
            ${dynamicFieldsHtml}
          </div>
          ${googleSheetsSection}
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This email was sent from the contact form on your website.
          </p>
        </div>
      `,
      replyTo: email
    };

    // Add timeout wrapper for email sending
    const sendWithTimeout = (transporter, mailOptions, timeoutMs = 25000) => {
      return Promise.race([
        transporter.sendMail(mailOptions),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Email send timeout - server did not respond within 25 seconds'));
          }, timeoutMs);
        })
      ]);
    };

    try {
      console.log('📧 [sendContactEmail] Calling transporter.sendMail()...');
      console.log('📧 [sendContactEmail] Mail options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        hasHtml: !!mailOptions.html
      });
      console.log('📧 [sendContactEmail] About to send email at:', new Date().toISOString());
      // #region agent log
      debugLog('emailService.js:162', 'before transporter.sendMail', {to:mailOptions.to,from:mailOptions.from}, 'H1');
      // #endregion
      
      const info = await sendWithTimeout(transporter, mailOptions);
      
      // #region agent log
      debugLog('emailService.js:167', 'transporter.sendMail success', {messageId:info?.messageId}, 'H1');
      // #endregion
      console.log('📧 [sendContactEmail] Email sent successfully at:', new Date().toISOString());
      
      console.log('✅ [sendContactEmail] Admin email sent successfully to:', process.env.RECIPIENT_EMAIL);
      if (process.env.EMAIL_USER && process.env.EMAIL_USER !== process.env.RECIPIENT_EMAIL) {
        console.log('📧 CC copy sent to EMAIL_USER:', process.env.EMAIL_USER);
      }
      console.log('📬 Message ID:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      // #region agent log
      debugLog('emailService.js:175', 'email send error in emailService', {errorMessage:err?.message,errorCode:err?.code,errorName:err?.name,responseCode:err?.responseCode,command:err?.command,hasCause:!!err?.cause,causeMessage:err?.cause?.message}, 'H1');
      // #endregion
      console.error('\n❌ ========== EMAIL SEND ERROR IN emailService ==========');
      console.error('❌ Timestamp:', new Date().toISOString());
      console.error('❌ Error sending admin email:', err.message);
      console.error('❌ Error name:', err.name);
      console.error('❌ Error code:', err.code);
      console.error('❌ Attempted to send to:', process.env.RECIPIENT_EMAIL);
      console.error('❌ Error response:', err.response);
      console.error('❌ Error responseCode:', err.responseCode);
      console.error('❌ Error command:', err.command);
      if (err.stack) {
        console.error('❌ Full stack trace:');
        console.error(err.stack);
      }
      if (err.cause) {
        console.error('❌ Cause:', err.cause);
      }
      console.error('❌ =========================================\n');
      
      // Enhanced error handling
      const e = new Error(`Failed to send email: ${err.message}`);
      e.code = 'EMAIL_SEND_FAILED';
      e.cause = err;
      
      // Add specific error codes for better handling
      if (err.message && err.message.includes('timeout')) {
        e.code = 'EMAIL_TIMEOUT';
      } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        e.code = 'EMAIL_CONNECTION_FAILED';
      } else if (err.responseCode === 535 || err.code === 'EAUTH') {
        e.code = 'EMAIL_AUTH_FAILED';
      }
      
      throw e;
    }
  }

  async sendConfirmationEmail(contactData) {
    console.log('📧 [sendConfirmationEmail] Starting...');
    
    try {
      // Validate config first (will throw if missing)
      try {
        this._validateEmailConfig();
      } catch (configError) {
        console.error('⚠️ [sendConfirmationEmail] Email config validation failed:', configError.message);
        // Don't throw - confirmation email is optional
        return;
      }
      
      // Ensure transporter is initialized (will throw if config missing)
      let transporter;
      try {
        transporter = this.transporter;
      } catch (transporterError) {
        console.error('⚠️ [sendConfirmationEmail] Failed to get transporter:', transporterError.message);
        // Don't throw - confirmation email is optional
        return;
      }
      
      const { email } = contactData;
      console.log('📧 [sendConfirmationEmail] Sending to user:', email);

      const customerName = contactData.name || contactData.fullName || contactData.customerName || 'Valued Customer';

      // Get company name and team name from environment variables
      const companyName = process.env.COMPANY_NAME || 'Your Company';
      const teamName = process.env.TEAM_NAME || 'Your Team';

      // Add EMAIL_USER as BCC to confirmation email so authenticated account receives a copy
      const mailOptions = {
        from: `"${companyName}" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Thank you for contacting us',
        // Add EMAIL_USER as BCC (hidden copy) to confirmation email
        ...(process.env.EMAIL_USER && process.env.EMAIL_USER !== email && { bcc: process.env.EMAIL_USER }),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Thank You for Contacting Us!</h2>
            <p>Dear ${customerName},</p>
            <p>We have received your message and will get back to you within 24 hours.</p>
            <p>Best regards,<br>${teamName}</p>
          </div>
        `
      };

      // Add timeout wrapper for email sending
      const sendWithTimeout = (transporter, mailOptions, timeoutMs = 25000) => {
        return Promise.race([
          transporter.sendMail(mailOptions),
          new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('Email send timeout - server did not respond within 25 seconds'));
            }, timeoutMs);
          })
        ]);
      };

      console.log('📧 [sendConfirmationEmail] Calling transporter.sendMail()...');
      const info = await sendWithTimeout(transporter, mailOptions);
      console.log('✅ [sendConfirmationEmail] Confirmation email sent successfully to:', email);
      if (process.env.EMAIL_USER && process.env.EMAIL_USER !== email) {
        console.log('📧 BCC copy sent to EMAIL_USER:', process.env.EMAIL_USER);
      }
      console.log('📬 Message ID:', info.messageId);
    } catch (error) {
      console.error('❌ Error sending confirmation email:', error.message);
      console.error('📧 Attempted to send to:', contactData.email);
      console.error('📧 Error code:', error.code);
      // Don't throw error for confirmation email failure - it's non-critical
    }
  }
}

module.exports = new EmailService();
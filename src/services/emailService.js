const { createTransporter } = require('../config/emailConfig');

class EmailService {
  constructor() {
    this.transporter = createTransporter();
  }

  async sendContactEmail(contactData) {
    const { email } = contactData; // Only email is required

    // Debug: Log the recipient email
    console.log('📧 Sending admin email to:', process.env.RECIPIENT_EMAIL);
    console.log('📧 Dynamic fields received:', Object.keys(contactData).join(', '));
    
    if (!process.env.RECIPIENT_EMAIL) {
      throw new Error('RECIPIENT_EMAIL is not set in .env file');
    }

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
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This email was sent from the contact form on your website.
          </p>
        </div>
      `,
      replyTo: email
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Admin email sent successfully to:', process.env.RECIPIENT_EMAIL);
      if (process.env.EMAIL_USER && process.env.EMAIL_USER !== process.env.RECIPIENT_EMAIL) {
        console.log('📧 CC copy sent to EMAIL_USER:', process.env.EMAIL_USER);
      }
      console.log('📬 Message ID:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Error sending admin email:', error.message);
      console.error('📧 Attempted to send to:', process.env.RECIPIENT_EMAIL);
      throw new Error('Failed to send email');
    }
  }

  async sendConfirmationEmail(contactData) {
    const { email } = contactData; // Only email is required

    // Extract name dynamically (try multiple common field names)
    const customerName = contactData.name || contactData.fullName || contactData.customerName || 'Valued Customer';

    // Debug: Log the confirmation email
    console.log('📧 Sending confirmation email to:', email);

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

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Confirmation email sent successfully to:', email);
      if (process.env.EMAIL_USER && process.env.EMAIL_USER !== email) {
        console.log('📧 BCC copy sent to EMAIL_USER:', process.env.EMAIL_USER);
      }
      console.log('📬 Message ID:', info.messageId);
    } catch (error) {
      console.error('❌ Error sending confirmation email:', error.message);
      console.error('📧 Attempted to send to:', email);
      // Don't throw error for confirmation email failure
    }
  }

  // New method: Send email with dynamic recipient/sender from query parameters
  // Accepts any dynamic fields from frontend/Postman
  async sendDynamicContactEmailFromQuery(contactData, queryParams) {
    const { email } = contactData; // Only email is required
    const { recipientEmail, senderEmail, googleSheetLink } = queryParams;

    // Use query recipientEmail if provided, otherwise fallback to .env
    const toEmail = recipientEmail || process.env.RECIPIENT_EMAIL;

    // Debug: Log the recipient email
    console.log('📧 Sending dynamic admin email to:', toEmail);
    console.log('📧 Dynamic fields received:', Object.keys(contactData).join(', '));
    if (senderEmail) {
      console.log('📧 CC (senderEmail):', senderEmail);
    }
    console.log('📧 From (authenticated):', process.env.EMAIL_USER);
    console.log('📧 Reply-To (dynamic):', senderEmail || email);
    console.log('📧 Source: Query Parameters');
    
    if (!toEmail) {
      throw new Error('Recipient email is required (either in query params or .env file)');
    }

    // Gmail security: "From" must match authenticated account
    // Use authenticated EMAIL_USER for "From", but set Reply-To to senderEmail if provided
    const authenticatedFrom = process.env.EMAIL_USER;
    const replyToEmail = senderEmail || email;

    // Extract name for "From" field (use name if provided, otherwise use email)
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

    // Build Google Sheets link HTML if provided
    const googleSheetsHtml = googleSheetLink ? `
      <div style="margin-top: 30px; padding: 20px; background-color: #e8f5e9; border-radius: 5px; border-left: 4px solid #34a853;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">📊 Google Sheets Link:</p>
        <p style="margin: 0 0 15px 0; color: #666; font-size: 14px;">
          This submission has also been saved to Google Sheets. You can view and manage all submissions there.
        </p>
        <a href="${googleSheetLink}" 
           style="display: inline-block; padding: 12px 24px; background-color: #34a853; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 10px;">
          Open Google Sheets
        </a>
        <p style="margin: 15px 0 0 0; font-size: 12px; color: #666; word-break: break-all;">
          ${googleSheetLink}
        </p>
      </div>
    ` : '';

    // Build CC/BCC recipients list
    const ccRecipients = [];
    if (senderEmail) {
      ccRecipients.push(senderEmail);
    }
    // Always add EMAIL_USER to CC so authenticated account receives a copy
    if (process.env.EMAIL_USER && process.env.EMAIL_USER !== toEmail) {
      ccRecipients.push(process.env.EMAIL_USER);
    }

    // Add senderEmail and EMAIL_USER as CC recipients
    const mailOptions = {
      from: `"${displayName}" <${authenticatedFrom}>`,
      to: toEmail,
      replyTo: replyToEmail,
      subject: `Contact Form: ${contactData.subject || contactData.inquiryType || 'New Submission'}`,
      // Add CC recipients (senderEmail + EMAIL_USER)
      ...(ccRecipients.length > 0 && { cc: ccRecipients.join(', ') }),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Contact Form Submission</h2>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px;">
            <p><strong>Email:</strong> ${email}</p>
            ${dynamicFieldsHtml}
          </div>
          ${googleSheetsHtml}
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This email was sent from the contact form on your website.
            ${senderEmail ? `<br>Reply to: ${senderEmail}` : ''}
          </p>
        </div>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Dynamic admin email sent successfully to:', toEmail);
      if (ccRecipients.length > 0) {
        console.log('📧 CC recipients:', ccRecipients.join(', '));
      }
      console.log('📬 Message ID:', info.messageId);
      return { success: true, messageId: info.messageId, recipientEmail: toEmail };
    } catch (error) {
      console.error('❌ Error sending dynamic admin email:', error.message);
      console.error('📧 Attempted to send to:', toEmail);
      throw new Error('Failed to send email');
    }
  }

  // New method: Send confirmation email with dynamic sender from query
  // Accepts any dynamic fields - uses name dynamically
  async sendDynamicConfirmationEmailFromQuery(contactData, queryParams) {
    const { email } = contactData; // Only email is required
    const { senderEmail, googleSheetLink } = queryParams;

    // Gmail security: "From" must match authenticated account
    // Use authenticated EMAIL_USER for "From", but set Reply-To to senderEmail if provided
    const authenticatedFrom = process.env.EMAIL_USER;
    const replyToEmail = senderEmail || process.env.EMAIL_USER;

    // Extract name dynamically (try multiple common field names)
    const customerName = contactData.name || contactData.fullName || contactData.customerName || 'Valued Customer';

    // Get company name and team name from environment variables
    const companyName = process.env.COMPANY_NAME || 'Your Company';
    const teamName = process.env.TEAM_NAME || 'Your Team';

    // Build Google Sheets link HTML if provided
    const googleSheetsHtml = googleSheetLink ? `
      <div style="margin-top: 30px; padding: 20px; background-color: #e8f5e9; border-radius: 5px; border-left: 4px solid #34a853;">
        <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">📊 View Your Submission:</p>
        <p style="margin: 0 0 15px 0; color: #666; font-size: 14px;">
          Your submission has been saved to our Google Sheets. You can view it there if needed.
        </p>
        <a href="${googleSheetLink}" 
           style="display: inline-block; padding: 12px 24px; background-color: #34a853; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 10px;">
          Open Google Sheets
        </a>
        <p style="margin: 15px 0 0 0; font-size: 12px; color: #666; word-break: break-all;">
          ${googleSheetLink}
        </p>
      </div>
    ` : '';

    // Debug: Log the confirmation email
    console.log('📧 Sending dynamic confirmation email to:', email);
    console.log('📧 From (authenticated):', authenticatedFrom);
    console.log('📧 Reply-To (dynamic):', replyToEmail);
    console.log('📧 Source: Query Parameters');

    // Add EMAIL_USER as BCC to confirmation email so authenticated account receives a copy
    const mailOptions = {
      from: `"${companyName}" <${authenticatedFrom}>`,
      to: email,
      replyTo: replyToEmail,
      subject: 'Thank you for contacting us',
      // Add EMAIL_USER as BCC (hidden copy) to confirmation email
      ...(process.env.EMAIL_USER && process.env.EMAIL_USER !== email && { bcc: process.env.EMAIL_USER }),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Thank You for Contacting Us!</h2>
          <p>Dear ${customerName},</p>
          <p>We have received your message and will get back to you within 24 hours.</p>
          ${googleSheetsHtml}
          <p>Best regards,<br>${teamName}</p>
        </div>
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Dynamic confirmation email sent successfully to:', email);
      if (process.env.EMAIL_USER && process.env.EMAIL_USER !== email) {
        console.log('📧 BCC copy sent to EMAIL_USER:', process.env.EMAIL_USER);
      }
      console.log('📬 Message ID:', info.messageId);
    } catch (error) {
      console.error('❌ Error sending dynamic confirmation email:', error.message);
      console.error('📧 Attempted to send to:', email);
      // Don't throw error for confirmation email failure
    }
  }
}

module.exports = new EmailService();
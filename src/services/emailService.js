const { createTransporter } = require('../config/emailConfig');

class EmailService {
  constructor() {
    this.transporter = createTransporter();
  }

  async sendContactEmail(contactData, googleSheetsResult = null) {
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
}

module.exports = new EmailService();
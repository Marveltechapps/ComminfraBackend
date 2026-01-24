/**
 * Email Configuration Diagnostic Script
 * Run this to test your email setup: node test-email-config.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

const { createTransporter } = require('./src/config/emailConfig');

async function testEmailConfig() {
  console.log('\n🔍 ========== EMAIL CONFIGURATION TEST ==========\n');
  
  // Check environment variables
  const requiredVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'RECIPIENT_EMAIL'];
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    console.error('   Make sure these are set in backend/.env file\n');
    process.exit(1);
  }
  
  console.log('✅ All required environment variables are set:');
  console.log('   EMAIL_HOST:', process.env.EMAIL_HOST);
  console.log('   EMAIL_PORT:', process.env.EMAIL_PORT);
  console.log('   EMAIL_USER:', process.env.EMAIL_USER);
  console.log('   RECIPIENT_EMAIL:', process.env.RECIPIENT_EMAIL);
  console.log('   EMAIL_PASS:', process.env.EMAIL_PASS ? '***' + process.env.EMAIL_PASS.slice(-4) : 'NOT SET');
  console.log('');
  
  // Test transporter creation
  console.log('📧 Testing transporter creation...');
  let transporter;
  try {
    transporter = createTransporter();
    console.log('✅ Transporter created successfully\n');
  } catch (error) {
    console.error('❌ Failed to create transporter:', error.message);
    console.error('   Error code:', error.code);
    process.exit(1);
  }
  
  // Test SMTP connection
  console.log('🔌 Testing SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection successful - server is ready to send emails\n');
  } catch (error) {
    console.error('❌ SMTP connection failed!');
    console.error('   Error message:', error.message);
    console.error('   Error code:', error.code);
    
    if (error.code === 'EAUTH') {
      console.error('\n💡 Authentication failed. Common causes:');
      console.error('   - Wrong password');
      console.error('   - For Gmail: Use App Password, not regular password');
      console.error('   - Enable 2FA and generate App Password: https://support.google.com/accounts/answer/185833');
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      console.error('\n💡 Connection failed. Common causes:');
      console.error('   - Wrong EMAIL_HOST or EMAIL_PORT');
      console.error('   - Firewall blocking SMTP port');
      console.error('   - Network connectivity issues');
    } else if (error.code === 'EHLO' || error.code === 'ESOCKET') {
      console.error('\n💡 SMTP handshake failed. Check:');
      console.error('   - EMAIL_HOST is correct');
      console.error('   - EMAIL_PORT is correct (587 for TLS, 465 for SSL)');
    }
    
    console.error('');
    process.exit(1);
  }
  
  // Test sending email
  console.log('📨 Testing email send...');
  try {
    const info = await transporter.sendMail({
      from: `"Test" <${process.env.EMAIL_USER}>`,
      to: process.env.RECIPIENT_EMAIL,
      subject: 'Email Configuration Test',
      text: 'This is a test email to verify your email configuration is working correctly.',
      html: '<p>This is a test email to verify your email configuration is working correctly.</p>'
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Sent to:', process.env.RECIPIENT_EMAIL);
    console.log('\n✅ ========== ALL TESTS PASSED ==========\n');
  } catch (error) {
    console.error('❌ Failed to send test email!');
    console.error('   Error message:', error.message);
    console.error('   Error code:', error.code);
    
    if (error.response) {
      console.error('   SMTP response:', error.response);
    }
    
    console.error('');
    process.exit(1);
  }
}

testEmailConfig().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

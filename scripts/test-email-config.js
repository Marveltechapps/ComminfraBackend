/**
 * Test Email Configuration Script
 * Run this to diagnose email setup issues
 * Usage: node scripts/test-email-config.js
 */

require('dotenv').config({ override: true });
const nodemailer = require('nodemailer');

console.log('🔍 Testing Email Configuration...\n');

// Check required environment variables
const requiredVars = {
  'EMAIL_USER': process.env.EMAIL_USER,
  'EMAIL_PASS': process.env.EMAIL_PASS,
  'EMAIL_HOST': process.env.EMAIL_HOST,
  'EMAIL_PORT': process.env.EMAIL_PORT,
  'RECIPIENT_EMAIL': process.env.RECIPIENT_EMAIL,
};

console.log('📋 Environment Variables:');
let allPresent = true;
for (const [key, value] of Object.entries(requiredVars)) {
  if (value) {
    // Mask password for security
    const displayValue = key === 'EMAIL_PASS' 
      ? '*'.repeat(Math.min(value.length, 8)) + ' (hidden)'
      : value;
    console.log(`  ✅ ${key}: ${displayValue}`);
  } else {
    console.log(`  ❌ ${key}: MISSING`);
    allPresent = false;
  }
}

if (!allPresent) {
  console.log('\n❌ Missing required environment variables!');
  console.log('💡 Add missing variables to backend/.env file');
  process.exit(1);
}

console.log('\n🔌 Testing SMTP Connection...');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Test connection
transporter.verify((error, success) => {
  if (error) {
    console.error('\n❌ SMTP Connection Failed!');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    
    // Provide specific guidance based on error
    if (error.message.includes('Invalid login') || error.message.includes('535')) {
      console.error('\n💡 Fix: Authentication failed');
      console.error('   - For Gmail: Use App Password (not regular password)');
      console.error('   - Generate at: https://myaccount.google.com/apppasswords');
      console.error('   - Make sure 2-Step Verification is enabled');
    } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      console.error('\n💡 Fix: Cannot connect to SMTP server');
      console.error(`   - Check EMAIL_HOST: ${process.env.EMAIL_HOST}`);
      console.error(`   - Check EMAIL_PORT: ${process.env.EMAIL_PORT}`);
      console.error('   - Verify firewall/network allows outbound SMTP');
    } else if (error.message.includes('timeout')) {
      console.error('\n💡 Fix: Connection timeout');
      console.error('   - Check network connectivity');
      console.error('   - Verify EMAIL_HOST and EMAIL_PORT are correct');
    } else {
      console.error('\n💡 Check your email provider documentation');
      console.error('   - Gmail: smtp.gmail.com:587');
      console.error('   - SendGrid: smtp.sendgrid.net:587');
      console.error('   - Mailgun: smtp.mailgun.org:587');
    }
    process.exit(1);
  } else {
    console.log('\n✅ SMTP Connection Successful!');
    console.log('✅ Email configuration is correct');
    console.log('\n📧 Ready to send emails');
    process.exit(0);
  }
});

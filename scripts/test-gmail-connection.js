/**
 * Test Gmail Connection Script
 * Specifically tests the Gmail account configuration
 * Usage: node scripts/test-gmail-connection.js
 */

require('dotenv').config({ override: true });
const nodemailer = require('nodemailer');

console.log('🔍 Testing Gmail Connection...\n');

// Check configuration
const config = {
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASS: process.env.EMAIL_PASS,
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: process.env.EMAIL_PORT,
  RECIPIENT_EMAIL: process.env.RECIPIENT_EMAIL,
};

console.log('📋 Configuration Check:');
let allPresent = true;
for (const [key, value] of Object.entries(config)) {
  if (value) {
    const displayValue = key === 'EMAIL_PASS' 
      ? '*'.repeat(Math.min(value.length, 8)) + ` (${value.length} chars)`
      : value;
    console.log(`  ✅ ${key}: ${displayValue}`);
  } else {
    console.log(`  ❌ ${key}: MISSING`);
    allPresent = false;
  }
}

if (!allPresent) {
  console.log('\n❌ Missing required configuration!');
  process.exit(1);
}

// Validate Gmail App Password format
if (config.EMAIL_PASS.length !== 16) {
  console.log('\n⚠️  WARNING: Gmail App Password should be 16 characters');
  console.log('   Your password is', config.EMAIL_PASS.length, 'characters');
  console.log('   Generate new App Password at: https://myaccount.google.com/apppasswords');
}

// Check if it's Gmail
if (!config.EMAIL_HOST.includes('gmail.com')) {
  console.log('\n⚠️  Not using Gmail - this script is optimized for Gmail');
}

console.log('\n🔌 Testing SMTP Connection...');

// Create transporter with Gmail-specific settings
const transporter = nodemailer.createTransport({
  host: config.EMAIL_HOST,
  port: parseInt(config.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: config.EMAIL_USER,
    pass: config.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  },
  debug: true,
  logger: true
});

// Test connection
transporter.verify((error, success) => {
  if (error) {
    console.error('\n❌ SMTP Connection Failed!\n');
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    
    if (error.response) {
      console.error('SMTP Response:', error.response);
    }
    
    if (error.responseCode) {
      console.error('SMTP Response Code:', error.responseCode);
    }
    
    if (error.command) {
      console.error('Failed Command:', error.command);
    }
    
    // Specific error guidance
    console.error('\n📋 Error Analysis:');
    
    if (error.message.includes('Invalid login') || 
        error.message.includes('535') || 
        error.message.includes('Username and Password')) {
      console.error('❌ AUTHENTICATION FAILED');
      console.error('\n💡 Fix Steps:');
      console.error('1. Verify 2-Step Verification is enabled:');
      console.error('   https://myaccount.google.com/security');
      console.error('2. Generate a NEW App Password:');
      console.error('   https://myaccount.google.com/apppasswords');
      console.error('3. Select "Mail" and "Other (Custom name)"');
      console.error('4. Copy the 16-character password');
      console.error('5. Update EMAIL_PASS in backend/.env');
      console.error('6. Restart backend server');
    } else if (error.message.includes('ECONNREFUSED') || 
               error.message.includes('ENOTFOUND') ||
               error.message.includes('timeout')) {
      console.error('❌ CONNECTION FAILED');
      console.error('\n💡 Fix Steps:');
      console.error('1. Check internet connection');
      console.error('2. Verify firewall allows outbound port 587');
      console.error('3. Try: EMAIL_PORT=465 and secure: true');
      console.error('4. Check if your network blocks SMTP');
    } else if (error.message.includes('EHLO') || 
               error.message.includes('handshake')) {
      console.error('❌ SMTP HANDSHAKE FAILED');
      console.error('\n💡 Fix Steps:');
      console.error('1. Verify EMAIL_HOST=smtp.gmail.com');
      console.error('2. Verify EMAIL_PORT=587');
      console.error('3. Check Gmail account is not locked');
    } else {
      console.error('❌ UNKNOWN ERROR');
      console.error('\n💡 Check:');
      console.error('1. Gmail account is active and not suspended');
      console.error('2. App Password was generated correctly');
      console.error('3. No special characters in App Password (copy carefully)');
    }
    
    console.error('\n📧 Gmail Account Checklist:');
    console.error('   ☐ 2-Step Verification enabled');
    console.error('   ☐ App Password generated (not regular password)');
    console.error('   ☐ App Password copied correctly (16 chars, no spaces)');
    console.error('   ☐ Account is not locked or suspended');
    console.error('   ☐ "Less secure app access" is NOT needed (App Passwords replace this)');
    
    process.exit(1);
  } else {
    console.log('\n✅ SMTP Connection Successful!');
    console.log('✅ Gmail authentication working');
    console.log('✅ Email configuration is correct');
    console.log('\n📧 Ready to send emails!');
    process.exit(0);
  }
});

/**
 * Diagnostic script to check Google Sheets configuration
 * Run: node scripts/check-google-sheets-config.js
 */

require('dotenv').config({ override: true });
const fs = require('fs');
const path = require('path');

console.log('🔍 Google Sheets Configuration Diagnostic\n');
console.log('=' .repeat(50));

// Check 1: GOOGLE_SHEETS_URL
console.log('\n1️⃣  Checking GOOGLE_SHEETS_URL...');
const sheetUrl = process.env.GOOGLE_SHEETS_URL;
if (sheetUrl) {
  console.log('   ✅ GOOGLE_SHEETS_URL is set');
  console.log('   📋 URL:', sheetUrl);
  
  // Validate URL format
  const isValid = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+/.test(sheetUrl);
  if (isValid) {
    console.log('   ✅ URL format is valid');
    const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      console.log('   📋 Spreadsheet ID:', match[1]);
    }
  } else {
    console.log('   ❌ URL format is INVALID');
    console.log('   💡 Should be: https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit');
  }
} else {
  console.log('   ❌ GOOGLE_SHEETS_URL is NOT set');
  console.log('   💡 Add GOOGLE_SHEETS_URL to your .env file');
}

// Check 2: Service Account Configuration
console.log('\n2️⃣  Checking Service Account Configuration...');
const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

if (serviceAccountPath) {
  console.log('   ✅ GOOGLE_SERVICE_ACCOUNT_PATH is set');
  console.log('   📋 Path:', serviceAccountPath);
  
  const fullPath = path.resolve(process.cwd(), serviceAccountPath);
  if (fs.existsSync(fullPath)) {
    console.log('   ✅ Service account file exists');
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      if (serviceAccount.client_email) {
        console.log('   ✅ Service account email:', serviceAccount.client_email);
        console.log('   💡 Make sure this email has Editor access to your Google Sheet!');
      } else {
        console.log('   ❌ Service account file missing client_email field');
      }
    } catch (error) {
      console.log('   ❌ Error reading service account file:', error.message);
    }
  } else {
    console.log('   ❌ Service account file NOT FOUND at:', fullPath);
    console.log('   💡 Place your service-account-key.json file in the backend directory');
  }
} else if (serviceAccountEmail) {
  console.log('   ✅ GOOGLE_SERVICE_ACCOUNT_EMAIL is set (inline JSON)');
  try {
    const serviceAccount = JSON.parse(serviceAccountEmail);
    if (serviceAccount.client_email) {
      console.log('   ✅ Service account email:', serviceAccount.client_email);
      console.log('   💡 Make sure this email has Editor access to your Google Sheet!');
    } else {
      console.log('   ❌ Service account JSON missing client_email field');
    }
  } catch (error) {
    console.log('   ❌ Invalid JSON in GOOGLE_SERVICE_ACCOUNT_EMAIL:', error.message);
  }
} else {
  console.log('   ⚠️  Service Account NOT configured');
  console.log('   💡 Set GOOGLE_SERVICE_ACCOUNT_PATH or GOOGLE_SERVICE_ACCOUNT_EMAIL in .env');
}

// Check 3: Webhook URL Configuration
console.log('\n3️⃣  Checking Webhook URL Configuration...');
const webhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
if (webhookUrl) {
  console.log('   ✅ GOOGLE_SHEETS_WEBHOOK_URL is set');
  console.log('   📋 URL:', webhookUrl);
  
  // Validate webhook URL format
  const isValidWebhook = /^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9-_]+\/exec/.test(webhookUrl);
  if (isValidWebhook) {
    console.log('   ✅ Webhook URL format is valid');
  } else {
    console.log('   ⚠️  Webhook URL format might be incorrect');
    console.log('   💡 Should be: https://script.google.com/macros/s/YOUR_WEBHOOK_ID/exec');
  }
} else {
  console.log('   ⚠️  GOOGLE_SHEETS_WEBHOOK_URL is NOT set');
  console.log('   💡 Set GOOGLE_SHEETS_WEBHOOK_URL if using webhook method');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('\n📊 Configuration Summary:\n');

const hasSheetUrl = !!sheetUrl;
const hasServiceAccount = !!(serviceAccountPath || serviceAccountEmail);
const hasWebhook = !!webhookUrl;
const hasWriteMethod = hasServiceAccount || hasWebhook;

if (hasSheetUrl && hasWriteMethod) {
  console.log('✅ Configuration looks good!');
  if (hasServiceAccount) {
    console.log('   📊 Using: Service Account API (Recommended)');
  } else {
    console.log('   📊 Using: Webhook URL');
  }
  console.log('\n💡 Next steps:');
  if (hasServiceAccount) {
    console.log('   1. Make sure your Google Sheet is shared with the service account email');
    console.log('   2. Give the service account "Editor" permission');
    console.log('   3. Test by submitting a contact form');
  } else {
    console.log('   1. Make sure your Apps Script webhook is deployed correctly');
    console.log('   2. Test the webhook URL manually');
    console.log('   3. Test by submitting a contact form');
  }
} else {
  console.log('❌ Configuration is incomplete!\n');
  
  if (!hasSheetUrl) {
    console.log('   ❌ Missing: GOOGLE_SHEETS_URL');
    console.log('      Add to .env: GOOGLE_SHEETS_URL=https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit\n');
  }
  
  if (!hasWriteMethod) {
    console.log('   ❌ Missing: Write method (Service Account OR Webhook URL)');
    console.log('      Option 1 - Service Account (Recommended):');
    console.log('         Add to .env: GOOGLE_SERVICE_ACCOUNT_PATH=./service-account-key.json');
    console.log('         See: GOOGLE_SHEETS_SETUP.md for setup instructions\n');
    console.log('      Option 2 - Webhook URL:');
    console.log('         Add to .env: GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_WEBHOOK_ID/exec');
    console.log('         See: GOOGLE_SHEETS_SETUP.md for setup instructions\n');
  }
}

console.log('\n📚 For detailed setup instructions, see:');
console.log('   - GOOGLE_SHEETS_SETUP.md');
console.log('   - GOOGLE_APPS_SCRIPT_CODE.gs (for webhook method)\n');

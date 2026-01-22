/**
 * Script to find potentially unused files in the project
 * Run: node scripts/find-unused-files.js
 */

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../');
const backendRoot = projectRoot;
const frontendRoot = path.resolve(projectRoot, '../frontend');

console.log('🔍 Analyzing Unused Files and Folders\n');
console.log('='.repeat(60));

// Files to check
const unusedFiles = [];

// 1. Check logger.js - not imported anywhere
console.log('\n1️⃣  Checking logger.js...');
const loggerPath = path.join(backendRoot, 'src/utils/logger.js');
if (fs.existsSync(loggerPath)) {
  // Check if it's imported anywhere
  const filesToCheck = [
    path.join(backendRoot, 'src/server.js'),
    path.join(backendRoot, 'src/controllers/contactController.js'),
    path.join(backendRoot, 'src/services/emailService.js'),
    path.join(backendRoot, 'src/services/googleSheetsService.js'),
  ];
  
  let isUsed = false;
  filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('logger') || content.includes('Logger')) {
        isUsed = true;
      }
    }
  });
  
  if (!isUsed) {
    console.log('   ⚠️  logger.js is NOT imported anywhere');
    unusedFiles.push({
      file: 'src/utils/logger.js',
      reason: 'Not imported or used in any file',
      type: 'utility'
    });
  } else {
    console.log('   ✅ logger.js is being used');
  }
}

// 2. Check submitDynamicContactFormQuery endpoint - not used by frontend
console.log('\n2️⃣  Checking submitDynamicContactFormQuery endpoint...');
const frontendFiles = [
  path.join(frontendRoot, 'src/pages/ContactPage.tsx'),
  path.join(frontendRoot, 'src/App.tsx'),
];

let dynamicEndpointUsed = false;
frontendFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('submit-dynamic-query') || content.includes('submitDynamicContactFormQuery')) {
      dynamicEndpointUsed = true;
    }
  }
});

if (!dynamicEndpointUsed) {
  console.log('   ⚠️  submitDynamicContactFormQuery endpoint is NOT used by frontend');
  unusedFiles.push({
    file: 'src/controllers/contactController.js (submitDynamicContactFormQuery function)',
    reason: 'Endpoint exists but not used by frontend - only in Postman collection',
    type: 'endpoint',
    note: 'May be used for API testing only'
  });
} else {
  console.log('   ✅ submitDynamicContactFormQuery is being used');
}

// 3. Check documentation files (may be redundant)
console.log('\n3️⃣  Checking documentation files...');
const docFiles = [
  'CORS_ERROR_EXPLANATION.md',
  'CORS_FIX_DEPLOYMENT.md',
  'QUICK_FIX_CORS.md',
  'INTEGRATION_TEST_GUIDE.md',
  'DEPLOYMENT_GUIDE.md',
  'EMAIL_SYSTEM_GUIDE.md',
  'GOOGLE_SHEETS_SETUP.md',
  'GOOGLE_SHEETS_TROUBLESHOOTING.md',
  'GOOGLE_SHEETS_DATA_FORMAT.md',
  'QUICK_FIX_GOOGLE_SHEETS.md',
];

console.log('   📚 Documentation files (all are informational, not code):');
docFiles.forEach(doc => {
  const docPath = path.join(backendRoot, doc);
  if (fs.existsSync(docPath)) {
    console.log(`      - ${doc} (exists)`);
  }
});

// 4. Check Postman collection
console.log('\n4️⃣  Checking Postman_Collection.json...');
const postmanPath = path.join(backendRoot, 'Postman_Collection.json');
if (fs.existsSync(postmanPath)) {
  console.log('   ✅ Postman_Collection.json exists (for API testing)');
}

// 5. Check GOOGLE_APPS_SCRIPT_CODE.gs
console.log('\n5️⃣  Checking GOOGLE_APPS_SCRIPT_CODE.gs...');
const appsScriptPath = path.join(backendRoot, 'GOOGLE_APPS_SCRIPT_CODE.gs');
if (fs.existsSync(appsScriptPath)) {
  console.log('   ✅ GOOGLE_APPS_SCRIPT_CODE.gs exists (reference code for webhook setup)');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 Summary of Potentially Unused Files:\n');

if (unusedFiles.length === 0) {
  console.log('✅ No unused files found! All files appear to be in use.\n');
} else {
  unusedFiles.forEach((item, index) => {
    console.log(`${index + 1}. ${item.file}`);
    console.log(`   Type: ${item.type}`);
    console.log(`   Reason: ${item.reason}`);
    if (item.note) {
      console.log(`   Note: ${item.note}`);
    }
    console.log('');
  });
}

console.log('💡 Notes:');
console.log('   - Documentation files (.md) are informational and can be kept');
console.log('   - logger.js might be intended for future use');
console.log('   - submitDynamicContactFormQuery might be for API testing only');
console.log('   - Always verify before deleting any files!\n');

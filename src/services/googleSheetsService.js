const https = require('https');
const { URL } = require('url');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

class GoogleSheetsService {
  /**
   * Extract spreadsheet ID from Google Sheets URL
   * @param {string} sheetUrl - Google Sheets URL
   * @returns {string|null} - Spreadsheet ID or null if invalid
   */
  extractSpreadsheetId(sheetUrl) {
    if (!sheetUrl || typeof sheetUrl !== 'string') {
      return null;
    }

    try {
      // Handle different Google Sheets URL formats:
      // https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
      // https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0
      // https://docs.google.com/spreadsheets/d/SPREADSHEET_ID
      const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      return match ? match[1] : null;
    } catch (error) {
      console.error('❌ Error extracting spreadsheet ID:', error.message);
      return null;
    }
  }

  /**
   * Validate Google Sheets URL format
   * @param {string} sheetUrl - Google Sheets URL
   * @returns {boolean} - True if valid format
   */
  isValidGoogleSheetsUrl(sheetUrl) {
    if (!sheetUrl || typeof sheetUrl !== 'string') {
      return false;
    }

    // Check if it's a Google Sheets URL
    const googleSheetsPattern = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+/;
    return googleSheetsPattern.test(sheetUrl);
  }

  /**
   * Convert contact data to row format for Google Sheets
   * Stores ALL fields with their keys as headers
   * Timestamp is added at the END (not first)
   * @param {object} contactData - Contact form data
   * @param {Array} headers - Headers array to match order
   * @returns {Array} - Array of values for a row (matching headers order)
   */
  convertToRowData(contactData, headers) {
    const row = [];
    
    // Get all keys from contactData and sort them for consistency
    const allKeys = Object.keys(contactData).sort();
    
    // Add values in the same order as headers (excluding Timestamp)
    headers.forEach(header => {
      if (header === 'Timestamp') {
        // Skip timestamp here, add at end
        return;
      }
      
      // Find matching key (case-insensitive, handle spaces)
      const matchingKey = allKeys.find(key => {
        const formattedHeader = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
        return formattedHeader.toLowerCase() === header.toLowerCase() || key.toLowerCase() === header.toLowerCase();
      });
      
      if (matchingKey) {
        const value = contactData[matchingKey];
        row.push(typeof value === 'object' ? JSON.stringify(value) : String(value || ''));
      } else {
        // If header doesn't match any key, add empty string
        row.push('');
      }
    });
    
    // Add timestamp at the END
    row.push(new Date().toISOString());
    
    return row;
  }

  /**
   * Convert contact data to header-value format for better organization
   * Stores ALL fields with their keys as headers (including dynamic fields)
   * Timestamp is added at the END (not first)
   * @param {object} contactData - Contact form data
   * @returns {object} - Object with headers and values
   */
  convertToHeaderValueFormat(contactData) {
    const headers = [];
    const values = [];

    // Get all keys from contactData and sort them for consistency
    const allKeys = Object.keys(contactData).sort();
    
    // Add all fields with their keys as headers (in sorted order)
    allKeys.forEach(key => {
      // Format header: capitalize first letter, add spaces before capitals
      const header = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
      headers.push(header);
      
      const value = contactData[key];
      values.push(typeof value === 'object' ? JSON.stringify(value) : String(value || ''));
    });
    
    // Add timestamp at the END
    headers.push('Timestamp');
    values.push(new Date().toISOString());

    return { headers, values };
  }

  /**
   * Submit data to Google Sheets via Apps Script Web App
   * Note: This requires a Google Apps Script web app to be set up
   * @param {string} webhookUrl - Google Apps Script web app URL (optional)
   * @param {object} contactData - Contact form data
   * @returns {Promise<object>} - Success/error result
   */
  async submitToGoogleSheetsViaWebhook(webhookUrl, contactData) {
    return new Promise((resolve) => {
      if (!webhookUrl) {
        return resolve({
          success: false,
          error: 'Webhook URL not provided. Google Sheets webhook URL is optional.'
        });
      }

      try {
        // Get headers and row data for dynamic field storage
        const { headers, values } = this.convertToHeaderValueFormat(contactData);
        const rowData = values; // Use values that match headers exactly
        
        // Log what's being saved to Google Sheets
        console.log('📊 Saving to Google Sheets via Webhook:');
        console.log('   Headers:', headers.join(', '));
        headers.forEach((header, index) => {
          if (header !== 'Timestamp' && values[index]) {
            console.log(`   ${header}: ${values[index]}`);
          }
        });
        
        const postData = JSON.stringify({
          headers: headers, // Send headers so Apps Script can create them dynamically
          data: rowData, // Values in exact same order as headers
          timestamp: new Date().toISOString()
        });

        const url = new URL(webhookUrl);
        const options = {
          hostname: url.hostname,
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        console.log('📊 Submitting to Google Sheets via webhook:', webhookUrl);
        console.log('📦 Payload:', postData.substring(0, 500));

        const req = https.request(options, (res) => {
          let responseData = '';

          res.on('data', (chunk) => {
            responseData += chunk;
          });

          res.on('end', () => {
            // Google Apps Script returns 200 on success, but may also redirect (302)
            // Also check response data for success/error
            let parsedResponse = null;
            try {
              parsedResponse = JSON.parse(responseData);
            } catch (e) {
              // Response might not be JSON
            }

            if (res.statusCode === 200 || res.statusCode === 302) {
              if (parsedResponse && parsedResponse.success === false) {
                console.error('❌ Google Sheets submission failed. Response:', parsedResponse);
                resolve({
                  success: false,
                  error: parsedResponse.error || 'Google Sheets submission failed',
                  statusCode: res.statusCode,
                  response: parsedResponse
                });
              } else {
                console.log('✅ Data submitted to Google Sheets successfully');
                console.log('📋 Saved fields:', headers.filter(h => h !== 'Timestamp' && h !== '').join(', '));
                console.log('📊 Response:', parsedResponse || responseData.substring(0, 200));
                resolve({
                  success: true,
                  message: 'Data submitted to Google Sheets successfully',
                  response: parsedResponse,
                  savedFields: headers.filter(h => h !== 'Timestamp' && h !== '')
                });
              }
            } else {
              console.error('❌ Google Sheets submission failed. Status:', res.statusCode);
              console.error('📊 Response:', responseData.substring(0, 500));
              resolve({
                success: false,
                error: `Google Sheets submission failed. Status: ${res.statusCode}`,
                statusCode: res.statusCode,
                response: responseData.substring(0, 500)
              });
            }
          });
        });

        req.on('error', (error) => {
          console.error('❌ Error submitting to Google Sheets:', error.message);
          resolve({
            success: false,
            error: `Network error: ${error.message}`
          });
        });

        req.setTimeout(10000, () => {
          req.destroy();
          console.error('❌ Google Sheets submission timeout');
          resolve({
            success: false,
            error: 'Google Sheets submission timeout. Please try again later.'
          });
        });

        req.write(postData);
        req.end();

      } catch (error) {
        console.error('❌ Error in Google Sheets submission:', error.message);
        resolve({
          success: false,
          error: `Error: ${error.message}`
        });
      }
    });
  }

  /**
   * Write data directly to Google Sheets using Apps Script webhook
   * Automatically generates webhook URL from sheet URL if not provided
   * @param {string} spreadsheetId - Google Sheets spreadsheet ID
   * @param {object} contactData - Contact form data
   * @returns {Promise<object>} - Success/error result
   */
  async writeToGoogleSheetsDirect(spreadsheetId, contactData) {
    // Try to use the webhook URL from environment variable if available
    const defaultWebhookUrl = process.env.GOOGLE_SHEETS_WEBHOOK_URL;
    
    if (!defaultWebhookUrl) {
      return {
        success: false,
        error: 'No webhook URL configured. Please set GOOGLE_SHEETS_WEBHOOK_URL in .env file or provide webhookUrl in query params. See GOOGLE_SHEETS_SETUP.md for setup instructions.'
      };
    }

    // Replace spreadsheet ID placeholder if webhook URL contains it
    let webhookUrl = defaultWebhookUrl.replace('{SPREADSHEET_ID}', spreadsheetId);

    return await this.submitToGoogleSheetsViaWebhook(webhookUrl, contactData);
  }

  /**
   * Write data to Google Sheets using Service Account (Direct API - Method 2)
   * This is the recommended professional approach - no webhook needed!
   * @param {string} spreadsheetId - Google Sheets spreadsheet ID
   * @param {object} contactData - Contact form data
   * @param {string} sheetName - Name of the sheet tab (default: 'Sheet1')
   * @returns {Promise<object>} - Success/error result
   */
  async writeToGoogleSheetsViaAPI(spreadsheetId, contactData, sheetName = 'Sheet1') {
    try {
      // Check if service account credentials are configured
      const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
      const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      
      if (!serviceAccountPath && !serviceAccountEmail) {
        return {
          success: false,
          error: 'Service account not configured. Set GOOGLE_SERVICE_ACCOUNT_PATH (for JSON file) or GOOGLE_SERVICE_ACCOUNT_EMAIL (for inline JSON) in .env. See GOOGLE_SHEETS_ALTERNATIVES.md for setup.'
        };
      }

      // Initialize Google Auth
      let auth;
      if (serviceAccountPath) {
        // Load service account from JSON file
        const fullPath = path.resolve(process.cwd(), serviceAccountPath);
        if (!fs.existsSync(fullPath)) {
          return {
            success: false,
            error: `Service account JSON file not found at: ${fullPath}`
          };
        }
        const serviceAccount = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        auth = new google.auth.GoogleAuth({
          credentials: serviceAccount,
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
      } else {
        // Use inline JSON from environment variable
        try {
          const serviceAccount = JSON.parse(serviceAccountEmail);
          auth = new google.auth.GoogleAuth({
            credentials: serviceAccount,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
          });
        } catch (parseError) {
          return {
            success: false,
            error: 'Invalid GOOGLE_SERVICE_ACCOUNT_EMAIL JSON format. Must be valid JSON string.'
          };
        }
      }

      // Initialize Google Sheets API
      const sheets = google.sheets({ version: 'v4', auth });

      // Get headers and values for dynamic field storage
      const { headers, values } = this.convertToHeaderValueFormat(contactData);
      const rowData = values; // Use values that match headers exactly
      
      // Log what's being saved to Google Sheets
      console.log('📊 Saving to Google Sheets:');
      console.log('   Headers:', headers.join(', '));
      headers.forEach((header, index) => {
        if (header !== 'Timestamp' && values[index]) {
          console.log(`   ${header}: ${values[index]}`);
        }
      });

      // Check if headers exist, add them if not
      const range = `${sheetName}!A1:ZZ1`; // Extended range for many columns
      const headerRange = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: range
      }).catch(() => ({ data: { values: [] } }));

      // Add spacing column for neat appearance
      const headersWithSpacing = headers.concat(['']);
      const rowDataWithSpacing = rowData.concat(['']);

      // If sheet is empty, add headers (all dynamic fields included) with spacing
      if (!headerRange.data.values || headerRange.data.values.length === 0) {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `${sheetName}!A1`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [headersWithSpacing]
          }
        });
      } else {
        // Check if we need to add new columns for new fields
        const existingHeaders = headerRange.data.values[0] || [];
        const newHeaders = headers.filter(h => !existingHeaders.includes(h));
        
        if (newHeaders.length > 0) {
          // Add new headers to the right (before spacing column)
          const lastColumn = existingHeaders.length;
          const newHeaderRange = `${sheetName}!${String.fromCharCode(65 + lastColumn)}1`;
          await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: newHeaderRange,
            valueInputOption: 'USER_ENTERED',
            resource: {
              values: [newHeaders]
            }
          });
        }
        
        // Ensure spacing column exists
        const allHeaders = headerRange.data.values[0] || [];
        if (allHeaders.length > 0 && allHeaders[allHeaders.length - 1] !== '') {
          // Add spacing column if it doesn't exist
          const spacingCol = allHeaders.length + 1;
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!${String.fromCharCode(64 + spacingCol)}1`,
            valueInputOption: 'USER_ENTERED',
            resource: {
              values: [['']]
            }
          });
        }
      }

      // Build row data matching existing headers order, then add new fields
      const existingHeaders = headerRange.data.values && headerRange.data.values.length > 0 
        ? headerRange.data.values[0] 
        : headersWithSpacing;
      
      const orderedRowData = existingHeaders.map(header => {
        if (header === '') {
          return ''; // Spacing column
        }
        const headerIndex = headers.indexOf(header);
        return headerIndex >= 0 ? rowData[headerIndex] : '';
      });
      
      // Add spacing column at the end if not already there
      if (orderedRowData[orderedRowData.length - 1] !== '') {
        orderedRowData.push('');
      }

      // Append data row (all fields including dynamic ones, properly aligned)
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:A`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [orderedRowData]
        }
      });

      console.log('✅ Data submitted to Google Sheets via API successfully');
      console.log('📋 Saved fields:', headers.filter(h => h !== 'Timestamp' && h !== '').join(', '));
      return {
        success: true,
        message: 'Data submitted to Google Sheets via API successfully',
        method: 'Service Account API',
        savedFields: headers.filter(h => h !== 'Timestamp' && h !== '')
      };

    } catch (error) {
      console.error('❌ Error writing to Google Sheets via API:', error.message);
      
      // Provide helpful error messages
      if (error.code === 403) {
        return {
          success: false,
          error: 'Permission denied. Make sure your sheet is shared with the service account email. Check GOOGLE_SHEETS_ALTERNATIVES.md for setup instructions.'
        };
      } else if (error.code === 404) {
        return {
          success: false,
          error: 'Spreadsheet not found. Check that the spreadsheet ID is correct and the sheet is accessible.'
        };
      }

      return {
        success: false,
        error: `API error: ${error.message}`
      };
    }
  }

  /**
   * Process Google Sheets integration
   * @param {string} sheetUrl - Google Sheets URL
   * @param {string} webhookUrl - Optional webhook URL for writing data
   * @param {object} contactData - Contact form data
   * @returns {Promise<object>} - Success/error result
   */
  async processGoogleSheets(sheetUrl, webhookUrl, contactData) {
    // Validate Google Sheets URL
    if (!this.isValidGoogleSheetsUrl(sheetUrl)) {
      return {
        success: false,
        error: 'Invalid Google Sheets URL. Please provide a valid Google Sheets link.'
      };
    }

    // Extract spreadsheet ID
    const spreadsheetId = this.extractSpreadsheetId(sheetUrl);
    if (!spreadsheetId) {
      return {
        success: false,
        error: 'Could not extract spreadsheet ID from Google Sheets URL.'
      };
    }

    // Try to write data to Google Sheets
    let submissionResult = null;
    
    console.log('🔍 Starting Google Sheets processing...');
    console.log('📋 Spreadsheet ID:', spreadsheetId);
    console.log('📋 Service Account configured:', !!(process.env.GOOGLE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL));
    console.log('📋 Webhook URL from .env:', process.env.GOOGLE_SHEETS_WEBHOOK_URL ? 'Yes' : 'No');
    console.log('📋 Webhook URL from query:', webhookUrl || 'None');
    
    // IMPORTANT: Use ONLY ONE method to avoid duplicate writes!
    // Priority 1: Try Service Account API (Method 2 - Recommended)
    if (process.env.GOOGLE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      console.log('📊 Writing to Google Sheets via Service Account API (ONLY method - no duplicates)...');
      submissionResult = await this.writeToGoogleSheetsViaAPI(spreadsheetId, contactData);
      
      // Only try webhook as fallback if API completely fails (not just for errors)
      if (!submissionResult.success && submissionResult.error && process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
        console.log('⚠️ API method failed, trying webhook fallback...');
        submissionResult = await this.writeToGoogleSheetsDirect(spreadsheetId, contactData);
      }
    }
    // Priority 2: Use provided webhook URL (if no Service Account)
    else if (webhookUrl) {
      console.log('📊 Writing to Google Sheets via provided webhook URL (ONLY method - no duplicates)...');
      submissionResult = await this.submitToGoogleSheetsViaWebhook(webhookUrl, contactData);
    } 
    // Priority 3: Use default webhook URL from .env (if no Service Account)
    else if (process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
      console.log('📊 Writing to Google Sheets via default webhook from .env (ONLY method - no duplicates)...');
      submissionResult = await this.writeToGoogleSheetsDirect(spreadsheetId, contactData);
    }
    // No method configured
    else {
      console.error('❌ No Google Sheets write method configured!');
      console.error('   Missing: Service Account OR Webhook URL');
      console.error('   💡 Set ONE of these in .env:');
      console.error('      - GOOGLE_SERVICE_ACCOUNT_PATH=./service-account-key.json (Recommended)');
      console.error('      - OR GOOGLE_SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_WEBHOOK_ID/exec');
      console.error('   📚 See GOOGLE_SHEETS_SETUP.md for detailed instructions');
      submissionResult = {
        success: false,
        error: 'No write method configured. Set GOOGLE_SERVICE_ACCOUNT_PATH or GOOGLE_SHEETS_WEBHOOK_URL in .env file. See GOOGLE_SHEETS_SETUP.md for setup instructions.'
      };
    }

    // Determine final message
    let message = 'Google Sheets URL validated';
    if (submissionResult && submissionResult.success) {
      message = 'Data successfully submitted to Google Sheets';
    } else if (submissionResult && !submissionResult.success) {
      message = 'Google Sheets URL validated, but data submission failed';
      if (submissionResult.error) {
        message += `: ${submissionResult.error}`;
      }
    } else {
      message = 'Google Sheets URL validated (webhook not configured, link will be shown in emails)';
    }

    return {
      success: true,
      message: message,
      sheetUrl: sheetUrl,
      spreadsheetId: spreadsheetId,
      submissionResult: submissionResult
    };
  }
}

module.exports = new GoogleSheetsService();

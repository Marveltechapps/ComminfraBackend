/**
 * Google Apps Script for Contact Form Backend
 * This script receives POST requests and writes data to Google Sheets
 */

/**
 * Handle GET requests (for authorization/testing)
 * When you open the webhook URL in browser, it uses GET
 */
function doGet(e) {
  try {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Google Sheets webhook is working! You can now use POST requests to send data.',
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle POST requests (for actual data submission)
 * This is called by your Node.js backend
 * Now supports dynamic headers for all fields including custom fields
 * Timestamp is added at the END
 * Properly aligns values under their correct headers
 */
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Check if sheet is empty
    const isSheetEmpty = sheet.getLastRow() === 0;
    
    // If sheet is empty, add headers (dynamic headers from backend)
    if (isSheetEmpty && data.headers) {
      // Add headers with spacing (empty column after last header for neatness)
      const headersWithSpacing = data.headers.concat(['']); // Add empty column for spacing
      sheet.appendRow(headersWithSpacing);
    } else if (isSheetEmpty) {
      // Fallback: use default headers if not provided
      sheet.appendRow(['Email', 'Name', 'Subject', 'Message', 'Timestamp', '']); // Timestamp at end
    } else {
      // Check if we need to add new columns for new fields
      const lastColumn = sheet.getLastColumn();
      const existingHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
      
      if (data.headers) {
        const newHeaders = data.headers.filter(h => existingHeaders.indexOf(h) === -1);
        if (newHeaders.length > 0) {
          // Add new headers to the right
          const startCol = lastColumn + 1;
          sheet.getRange(1, startCol, 1, newHeaders.length).setValues([newHeaders]);
        }
      }
    }
    
    // Get current headers to align data properly
    const lastColumn = sheet.getLastColumn();
    const currentHeaders = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
    
    // Build row data matching current headers order
    const rowData = [];
    if (data.headers && data.data) {
      currentHeaders.forEach(header => {
        if (header === '') {
          // Empty column for spacing
          rowData.push('');
        } else {
          const headerIndex = data.headers.indexOf(header);
          if (headerIndex >= 0 && headerIndex < data.data.length) {
            rowData.push(data.data[headerIndex]);
          } else {
            rowData.push(''); // Empty if header not in new data
          }
        }
      });
    } else {
      // Fallback: use data as-is
      rowData.push(...data.data);
      rowData.push(''); // Add spacing column
    }
    
    // Append the data row (values matching headers, properly aligned)
    sheet.appendRow(rowData);
    
    return ContentService
      .createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({success: false, error: error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

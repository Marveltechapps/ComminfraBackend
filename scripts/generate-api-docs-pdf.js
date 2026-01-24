/**
 * Generates CONTACT_API_ENDPOINTS.pdf using pdf-lib.
 * Run: npm install pdf-lib --save-dev && npm run docs:pdf
 */

const fs = require('fs');
const path = require('path');

async function main() {
  let PDFDocument, StandardFonts, rgb;
  try {
    const pdf = require('pdf-lib');
    PDFDocument = pdf.PDFDocument;
    StandardFonts = pdf.StandardFonts;
    rgb = pdf.rgb;
  } catch (e) {
    console.error('Install pdf-lib: npm install pdf-lib --save-dev');
    process.exit(1);
  }

  const docsDir = path.join(__dirname, '../docs');
  const pdfPath = path.join(docsDir, 'CONTACT_API_ENDPOINTS.pdf');

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const size = 10;
  const lineHeight = 13;
  const margin = 50;
  const maxWidth = 495;
  let y = 800;
  let page = doc.addPage([595, 842]); // A4

  function draw(text, opts = {}) {
    const f = opts.bold ? fontBold : font;
    const sz = opts.size || size;
    const lines = text.split('\n');
    for (const line of lines) {
      if (y < 60) {
        page = doc.addPage([595, 842]);
        y = 792;
      }
      page.drawText(line, {
        x: margin,
        y,
        size: sz,
        font: f,
        color: rgb(0.1, 0.1, 0.1),
        maxWidth: maxWidth,
      });
      y -= lineHeight;
    }
  }

  function space(n = 1) {
    y -= lineHeight * n;
  }

  draw('Contact API Endpoints', { bold: true, size: 16 });
  space(2);
  draw('Base URL: http://13.232.113.79:5000');
  draw('API Prefix: /api/contact');
  draw('Full Base: http://13.232.113.79:5000/api/contact');
  space(2);

  draw('1. Health Check', { bold: true, size: 12 });
  space(1);
  draw('GET /api/contact/health');
  draw('http://13.232.113.79:5000/api/contact/health');
  draw('Description: Returns API status, version, and email configuration.');
  draw('Request: No body. No required headers.');
  draw('Response (200): success, message, timestamp, version, emailConfig, testMode');
  draw('Example: curl http://13.232.113.79:5000/api/contact/health');
  space(2);

  draw('2. Submit Contact Form (Production)', { bold: true, size: 12 });
  space(1);
  draw('POST /api/contact/submit');
  draw('http://13.232.113.79:5000/api/contact/submit');
  draw('Description: Accepts contact form. Validates, sends email, Google Sheets. Always 200 OK.');
  draw('Headers: Content-Type: application/json');
  draw('Body (JSON): email (required), name, phone, message, inquiryType, subject');
  draw('Example: {"email":"user@gmail.com","name":"Jane","message":"Hello"}');
  draw('Success (200): success, message, messageId, emailStatus, googleSheets');
  draw('Validation (400): success:false, message, errors[]');
  draw('Example: curl -X POST .../submit -H "Content-Type: application/json" -d \'{"email":"x@gmail.com"}\'');
  draw('Rate limit: 100/min per IP');
  space(2);

  draw('3. Submit Test (Debug)', { bold: true, size: 12 });
  space(1);
  draw('POST /api/contact/submit-test');
  draw('http://13.232.113.79:5000/api/contact/submit-test');
  draw('Description: Same as /submit but does NOT send emails. For debugging.');
  draw('Request/Response: Same shape as /submit.');
  draw('Example: curl -X POST .../submit-test -H "Content-Type: application/json" -d \'{"email":"t@gmail.com"}\'');
  space(2);

  draw('Summary', { bold: true, size: 12 });
  space(1);
  draw('GET  /api/contact/health      Health check');
  draw('POST /api/contact/submit      Production form');
  draw('POST /api/contact/submit-test  Test (no email)');
  space(1);
  draw('Base: http://13.232.113.79:5000');
  draw('Contact Form API — Version 2.0.0-fixed', { size: 9 });

  const pdfBytes = await doc.save();
  fs.writeFileSync(pdfPath, pdfBytes);
  console.log('PDF written to:', pdfPath);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

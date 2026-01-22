# Contact Form Backend

A Node.js backend service for handling contact form submissions with email functionality using Nodemailer.

## Features

- ✅ Contact form validation with Joi
- ✅ Email sending with Nodemailer
- ✅ Rate limiting for security
- ✅ CORS support
- ✅ Helmet security headers
- ✅ Error handling middleware
- ✅ Logging utility
- ✅ Health check endpoints

## Project Structure

```
contact-form-backend/
├── src/
│   ├── controllers/
│   │   └── contactController.js
│   ├── middleware/
│   │   ├── validationMiddleware.js
│   │   └── errorHandler.js
│   ├── routes/
│   │   └── contactRoutes.js
│   ├── services/
│   │   └── emailService.js
│   ├── utils/
│   │   └── logger.js
│   └── config/
│       └── emailConfig.js
├── logs/
├── .env
├── server.js
├── package.json
└── README.md
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
PORT=5000
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
RECIPIENT_EMAIL=recipient@example.com
COMPANY_NAME=Your Company Name
TEAM_NAME=Your Team Name
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 3. Email Configuration

#### Gmail SMTP Setup
1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password: https://support.google.com/accounts/answer/185833
3. Use the App Password as `EMAIL_PASS` in your `.env` file

#### Alternative Email Providers

**SendGrid:**
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
```

**Mailgun:**
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@yourdomain.mailgun.org
EMAIL_PASS=your-mailgun-api-key
```

### 4. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## API Endpoints

### Health Check
- **GET** `/health` - General health check
- **GET** `/api/contact/health` - Contact API health check

### Contact Form
- **POST** `/api/contact/submit` - Submit contact form

#### Request Body:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "subject": "Inquiry about services",
  "message": "Hello, I would like to know more about your services."
}
```

#### Response:
```json
{
  "success": true,
  "message": "Contact form submitted successfully",
  "messageId": "1234567890"
}
```

## Testing

### Health Check
```bash
curl http://localhost:5000/health
```

### Contact Form Submission
```bash
curl -X POST http://localhost:5000/api/contact/submit \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "subject": "Test Subject",
    "message": "This is a test message"
  }'
```

## Frontend Integration

```javascript
const submitContactForm = async (formData) => {
  try {
    const response = await fetch('http://localhost:5000/api/contact/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (result.success) {
      alert('Message sent successfully!');
    } else {
      alert('Failed to send message: ' + result.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred. Please try again.');
  }
};
```

## Security Features

- **Rate Limiting**: 5 requests per 15 minutes per IP
- **Input Validation**: Joi schema validation
- **CORS**: Configured for specific frontend URL
- **Security Headers**: Helmet.js middleware
- **Error Handling**: Comprehensive error responses

## Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests (not implemented yet)

### Logging

Logs are stored in the `logs/` directory with daily rotation. Logs include:
- Info messages
- Error messages
- Request details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

ISC
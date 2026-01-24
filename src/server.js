// Load .env file - IMPORTANT: Must be first!
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../.env');
const envResult = dotenv.config({ path: envPath, override: true });

if (envResult.error) {
  console.warn('⚠️  Could not load .env file from:', envPath);
  dotenv.config({ override: true });
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const contactRoutes = require('./routes/contactRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

console.log('📁 .env loaded:', envResult.error ? '❌ Failed' : '✅ Success');

const emailVars = ['EMAIL_USER', 'EMAIL_PASS', 'RECIPIENT_EMAIL', 'EMAIL_HOST', 'EMAIL_PORT'];
const missingEmail = emailVars.filter((v) => !process.env[v]);
if (missingEmail.length) {
  console.error('❌ Email configuration incomplete! Missing:', missingEmail.join(', '));
} else {
  console.log('✅ All email configuration variables are set');
}

app.use(helmet());

const restrictCORS = process.env.CORS_RESTRICT === 'true';
if (!restrictCORS) {
  app.use(cors({ origin: true, credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
} else {
  const allowedOrigins = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(url => url.trim()) : ['http://localhost:3000', 'http://localhost:5173'];
  app.use(cors({ origin: allowedOrigins, credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
}

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/contact/submit', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  if (req.method === 'POST' && req.path?.includes('/contact')) {
    console.log('🔍 [MIDDLEWARE] req.body exists:', !!req.body);
  }
  next();
});

app.use('/api/contact', contactRoutes);

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION:', error);
  process.exit(1);
});

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});

server.timeout = 30000;
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

module.exports = app;
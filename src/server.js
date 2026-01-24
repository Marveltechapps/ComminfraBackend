// Load .env file - IMPORTANT: Must be first!
const path = require('path');
const dotenv = require('dotenv');

// Try to load .env from backend directory (works even if running from different location)
const envPath = path.resolve(__dirname, '../.env');
const envResult = dotenv.config({ path: envPath, override: true });

if (envResult.error) {
  console.warn('⚠️  Could not load .env file from:', envPath);
  console.warn('   Trying default location...');
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

// Diagnostic: Check if .env loaded correctly
console.log('📁 Current working directory:', process.cwd());
console.log('📁 .env file path:', envPath);
console.log('📁 .env loaded:', envResult.error ? '❌ Failed' : '✅ Success');

// Validate email config on startup
const emailVars = ['EMAIL_USER', 'EMAIL_PASS', 'RECIPIENT_EMAIL', 'EMAIL_HOST', 'EMAIL_PORT'];
const missingEmail = emailVars.filter((v) => !process.env[v]);
if (missingEmail.length) {
  console.error('❌ Email configuration incomplete!');
  console.error('   Missing variables:', missingEmail.join(', '));
  console.error('   Make sure .env file is in: backend/.env');
  console.error('   Current working directory:', process.cwd());
  console.error('   .env file path:', envPath);
  console.error('   ⚠️  Contact form will return 503 until these are set');
} else {
  console.log('✅ All email configuration variables are set');
  // Test transporter creation on startup (in development)
  if (process.env.NODE_ENV === 'development') {
    try {
      const { createTransporter } = require('./config/emailConfig');
      createTransporter();
      console.log('✅ Email transporter can be created successfully');
    } catch (err) {
      console.error('❌ Failed to create email transporter on startup:', err.message);
    }
  }
}
// Listen on all interfaces (0.0.0.0) so remote clients can connect. Default localhost-only causes ERR_CONNECTION_TIMED_OUT.
const HOST = process.env.HOST || '0.0.0.0';

// Security middleware
app.use(helmet());

// CORS configuration - Default: Allow all origins for easier deployment
// To restrict: Set CORS_RESTRICT=true and FRONTEND_URL in .env
const restrictCORS = process.env.CORS_RESTRICT === 'true';

if (!restrictCORS) {
  // Default: Allow all origins (works for all deployment scenarios)
  app.use(cors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  console.log('🔓 CORS: Allowing all origins (default mode)');
  console.log('💡 To restrict CORS, set CORS_RESTRICT=true in .env');
} else {
  // Restricted mode: Use specific allowed origins from FRONTEND_URL
  const allowedOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : [
        // Default allowed origins
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080',
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/, // Allow any local network IP (192.168.x.x:port)
        /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/, // Allow any 10.x.x.x network IP
        /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/, // Allow any 172.16-31.x.x network IP
        /^http:\/\/localhost:\d+$/, // Allow any localhost port
        /^http:\/\/127\.0\.0\.1:\d+$/ // Allow any 127.0.0.1 port
      ];

  app.use(cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (typeof allowedOrigin === 'string') {
          return origin === allowedOrigin;
        } else if (allowedOrigin instanceof RegExp) {
          return allowedOrigin.test(origin);
        }
        return false;
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.log('⚠️ CORS blocked origin:', origin);
        console.log('✅ Allowed origins:', allowedOrigins);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  console.log('🔒 CORS: Using restricted origins (restricted mode)');
  console.log('📋 Allowed origins:', allowedOrigins);
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // Reduced to 1 minute for easier testing
  max: 100, // Increased to 100 requests per window for testing
  message: {
    success: false,
    message: 'Too many contact form submissions, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/contact/submit', limiter);

// Body parsing middleware - MUST be before routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Diagnostic middleware to log request body (for debugging)
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path.includes('/contact')) {
    console.log('🔍 [MIDDLEWARE] Request body check:');
    console.log('   req.body exists:', !!req.body);
    console.log('   req.body type:', typeof req.body);
    console.log('   req.body keys:', req.body ? Object.keys(req.body) : 'N/A');
  }
  next();
});

// Routes
app.use('/api/contact', contactRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ ========== UNHANDLED PROMISE REJECTION ==========');
  console.error('❌ Reason:', reason);
  console.error('❌ Promise:', promise);
  if (reason instanceof Error) {
    console.error('❌ Error message:', reason.message);
    console.error('❌ Stack trace:', reason.stack);
  }
  console.error('❌ =========================================\n');
  // Don't exit - let the server continue running
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('\n❌ ========== UNCAUGHT EXCEPTION ==========');
  console.error('❌ Error:', error);
  console.error('❌ Stack:', error.stack);
  console.error('❌ =========================================\n');
  // Exit gracefully
  process.exit(1);
});

// Listen on HOST (default 0.0.0.0) to accept connections from external IPs (required for remote access)
const server = app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  if (HOST === '0.0.0.0') {
    console.log('Listening on all interfaces (remote access enabled)');
  }
});

// Set timeout to prevent hanging requests
server.timeout = 30000; // 30 seconds
server.keepAliveTimeout = 65000; // 65 seconds
server.headersTimeout = 66000; // 66 seconds

module.exports = app;
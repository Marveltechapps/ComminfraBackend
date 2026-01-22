require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const contactRoutes = require('./routes/contactRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

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

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
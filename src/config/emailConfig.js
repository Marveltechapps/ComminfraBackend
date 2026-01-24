const nodemailer = require('nodemailer');

const createTransporter = () => {
  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  // Validate all required config before creating transporter
  const missing = [];
  if (!host) missing.push('EMAIL_HOST');
  if (!port) missing.push('EMAIL_PORT');
  if (!user) missing.push('EMAIL_USER');
  if (!pass) missing.push('EMAIL_PASS');

  if (missing.length > 0) {
    const error = new Error(`Email configuration incomplete: Missing ${missing.join(', ')}. Set these in backend/.env file.`);
    error.code = 'EMAIL_CONFIG_MISSING';
    console.error('❌ Cannot create email transporter:', error.message);
    console.error('   Current working directory:', process.cwd());
    throw error;
  }

  // Gmail-specific settings
  const isGmail = host && host.includes('gmail.com');
  
  console.log('📧 Creating email transporter with:', {
    host: host,
    port: parseInt(port) || 587,
    user: user,
    isGmail: isGmail
  });
  
  return nodemailer.createTransport({
    host: host,
    port: parseInt(port) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: user,
      pass: pass,
    },
    // Connection timeout settings (increase for slow networks)
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 60000, // 60 seconds
    // Gmail-specific options
    ...(isGmail && {
      tls: {
        rejectUnauthorized: false // Gmail sometimes requires this
      },
      debug: process.env.NODE_ENV === 'development', // Enable debug in dev
      logger: process.env.NODE_ENV === 'development' // Enable logging in dev
    })
  });
};

module.exports = { createTransporter };
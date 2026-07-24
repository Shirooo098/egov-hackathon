require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', require('./routes/verify'));
app.use('/api/matches', require('./routes/match'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/blockchain', require('./routes/blockchain'));
app.use('/api/egovai', require('./routes/egovai'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'eBuhay DICT eGov Platform API is operational',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      eVerify: 'READY',
      eMessage: 'READY',
      eGovAI: 'READY',
      BesuBlockchain: 'READY (Chain ID 13371)'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : null
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`  eBuhay DICT API Server Running on port ${PORT}  `);
    console.log(`  Health: http://localhost:${PORT}/api/health       `);
    console.log(`  Match:  http://localhost:${PORT}/api/matches/find `);
    console.log(`===================================================`);
  });
}

module.exports = app;

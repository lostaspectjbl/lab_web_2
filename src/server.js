const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { resetDatabase } = require('./db');

const app = express();

// View engine setup (EJS)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// Security headers: Disable X-Powered-By, avoid MIME sniffing
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// Routes
const indexRoutes = require('./routes/index');
const lab01Routes = require('./routes/lab01');
const lab02Routes = require('./routes/lab02');
const lab03Routes = require('./routes/lab03');
const lab04Routes = require('./routes/lab04');
const lab05Routes = require('./routes/lab05');

app.use('/', indexRoutes);
app.use('/lab01', lab01Routes);
app.use('/lab02', lab02Routes);
app.use('/lab03', lab03Routes);
app.use('/lab04', lab04Routes);
app.use('/lab05', lab05Routes);

// Lightweight tracking endpoint for Lab 03 (transparent 1x1 GIF)
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);
app.get(['/images/tracker.gif', '/track'], (req, res) => {
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store');
  res.send(TRANSPARENT_GIF);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database reset endpoint (can be called by cron or admin)
app.post('/reset', (req, res) => {
  try {
    resetDatabase();
    res.json({ success: true, message: 'Database reset successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset database', details: err.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).send('Page Not Found');
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).send('Internal Server Error');
});

// Start server if run directly
if (require.main === module) {
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`[+] XSS Lab Series server is running on http://0.0.0.0:${config.port}`);
    console.log(`[+] Environment: ${config.nodeEnv}`);
  });
}

module.exports = app;

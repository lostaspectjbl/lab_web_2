const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { resetDatabase } = require('./db');

// Main Application (Lab Web Platform)
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
const lab06Routes = require('./routes/lab06');
const lab07Routes = require('./routes/lab07');
const lab08Routes = require('./routes/lab08');
const lab09Routes = require('./routes/lab09');
const lab10Routes = require('./routes/lab10');
const helperRoutes = require('./routes/helper');

app.use('/', indexRoutes);
app.use('/lab01', lab01Routes);
app.use('/lab02', lab02Routes);
app.use('/lab03', lab03Routes);
app.use('/lab04', lab04Routes);
app.use('/lab05', lab05Routes);
app.use('/lab06', lab06Routes);
app.use('/lab07', lab07Routes);
app.use('/lab08', lab08Routes);
app.use('/lab09', lab09Routes);
app.use('/lab10', lab10Routes);
app.use('/helper', helperRoutes);

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

// -------------------------------------------------------------
// Separate Origin: Challenge Helper Application (Port 3001)
// -------------------------------------------------------------
const helperApp = express();
helperApp.set('views', path.join(__dirname, 'views'));
helperApp.set('view engine', 'ejs');
helperApp.use(express.urlencoded({ extended: false }));
helperApp.use(express.json());
helperApp.use(express.static(path.join(__dirname, '../public')));
helperApp.disable('x-powered-by');

// Root redirect to /helper on the helper origin
helperApp.get('/', (req, res) => {
  res.redirect('/helper');
});
helperApp.use('/helper', helperRoutes);

// 404 handler for main app
app.use((req, res) => {
  res.status(404).send('Page Not Found');
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).send('Internal Server Error');
});

// Start servers if run directly
if (require.main === module) {
  // 1. Start main lab server
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`[+] XSS Lab Series server is running on http://0.0.0.0:${config.port}`);
  });

  // 2. Start challenge helper server on separate origin
  helperApp.listen(config.helperPort, '0.0.0.0', () => {
    console.log(`[+] Challenge Helper server running on http://0.0.0.0:${config.helperPort} (Separate Origin)`);
  });
}

module.exports = { app, helperApp };

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const crypto = require('crypto');
const config = require('./config');
const { resetDatabase, resetSession } = require('./db');

// ── Main Application ──────────────────────────────────────────────────────────
const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

// ── Per-user session ──────────────────────────────────────────────────────────
// Each browser gets its own isolated session so stored-XSS comments in
// lab02 and lab08 are not shared between participants.
app.use(session({
  name: 'bytenote_sid',
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: true,   // give every visitor a session ID immediately
  cookie: {
    httpOnly: false,          // must stay false so flag cookie is readable by JS
    sameSite: 'lax',
    maxAge: 4 * 60 * 60 * 1000  // 4 hours
  }
}));

// ── Routes ────────────────────────────────────────────────────────────────────
const indexRoutes  = require('./routes/index');
const lab01Routes  = require('./routes/lab01');
const lab02Routes  = require('./routes/lab02');
const lab03Routes  = require('./routes/lab03');
const lab04Routes  = require('./routes/lab04');
const lab05Routes  = require('./routes/lab05');
const lab06Routes  = require('./routes/lab06');
const lab07Routes  = require('./routes/lab07');
const lab08Routes  = require('./routes/lab08');
const lab09Routes  = require('./routes/lab09');
const lab10Routes  = require('./routes/lab10');
const helperRoutes = require('./routes/helper');

// All public blog routes (/, /articles, /shop, /about, /contact, /search)
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

// Transparent 1x1 GIF for Lab 03 tracker
const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);
app.get(['/images/tracker.gif', '/track'], (req, res) => {
  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store');
  res.send(TRANSPARENT_GIF);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global database reset (admin/cron use)
app.post('/reset', (req, res) => {
  try {
    resetDatabase();
    res.json({ success: true, message: 'Database reset successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset database', details: err.message });
  }
});

// Per-session reset — clears only the current user's stored comments
app.post('/reset/session', (req, res) => {
  try {
    resetSession(req.session.id);
    res.json({ success: true, message: 'Your session data has been reset.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset session', details: err.message });
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

// ── Separate Origin: Challenge Helper (Port 3001) ─────────────────────────────
const helperApp = express();
helperApp.set('views', path.join(__dirname, 'views'));
helperApp.set('view engine', 'ejs');
helperApp.use(express.urlencoded({ extended: false }));
helperApp.use(express.json());
helperApp.use(express.static(path.join(__dirname, '../public')));
helperApp.disable('x-powered-by');

helperApp.get('/', (req, res) => { res.redirect('/helper'); });
helperApp.use('/helper', helperRoutes);

// ── Start servers ─────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`[+] XSS Lab Series server is running on http://0.0.0.0:${config.port}`);
  });
  helperApp.listen(config.helperPort, '0.0.0.0', () => {
    console.log(`[+] Challenge Helper server running on http://0.0.0.0:${config.helperPort} (Separate Origin)`);
  });
}

module.exports = { app, helperApp };

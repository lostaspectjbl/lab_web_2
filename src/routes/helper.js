const express = require('express');
const router = express.Router();
const { db } = require('../db');
const config = require('../config');

const MAX_DOCUMENT_SIZE = 10 * 1024; // 10 KB limit

// View & Management page for Challenge Helper documents
router.get('/', (req, res) => {
  const teamId = req.query.teamId ? String(req.query.teamId).trim() : '';
  const saved = req.query.saved === 'true';
  const error = req.query.error ? String(req.query.error) : null;

  let existingContent = '';
  if (teamId) {
    const row = db.prepare('SELECT html_content FROM helpers WHERE team_id = ?').get(teamId);
    if (row) {
      existingContent = row.html_content;
    }
  }

  res.render('helper', {
    teamId,
    existingContent,
    saved,
    error,
    helperHost: config.helperHost,
    labHost: `http://localhost:${config.port}`
  });
});

// Save or update an HTML document
router.post('/save', (req, res) => {
  const teamId = req.body.teamId ? String(req.body.teamId).trim() : '';
  const htmlContent = req.body.htmlContent !== undefined ? String(req.body.htmlContent) : '';

  // Validate teamId format (alphanumeric, hyphens, underscores; max 32 chars)
  const teamIdRegex = /^[a-zA-Z0-9_-]{1,32}$/;
  if (!teamIdRegex.test(teamId)) {
    return res.redirect('/helper?error=invalid_team_id');
  }

  // Validate size limit (10 KB)
  const byteLength = Buffer.byteLength(htmlContent, 'utf8');
  if (byteLength > MAX_DOCUMENT_SIZE) {
    return res.redirect('/helper?error=size_exceeded&teamId=' + encodeURIComponent(teamId));
  }

  // Parameterized upsert query into SQLite
  const stmt = db.prepare(`
    INSERT INTO helpers (team_id, html_content, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(team_id) DO UPDATE SET
      html_content = excluded.html_content,
      updated_at = CURRENT_TIMESTAMP
  `);
  stmt.run(teamId, htmlContent);

  res.redirect(`/helper?teamId=${encodeURIComponent(teamId)}&saved=true`);
});

// Serve the raw HTML document for the given team_id (Separate Origin)
router.get('/:teamId', (req, res) => {
  const teamId = String(req.params.teamId).trim();
  const row = db.prepare('SELECT html_content FROM helpers WHERE team_id = ?').get(teamId);

  if (!row) {
    return res.status(404).type('text/html').send(`
      <!DOCTYPE html>
      <html>
      <head><title>Helper Page Not Found</title></head>
      <body style="font-family: sans-serif; padding: 2rem;">
        <h2>Helper document not found for team: <code>${teamId.replace(/[<>]/g, '')}</code></h2>
        <p>Please create and save your exploit HTML document at <a href="${config.helperHost}/helper">/helper</a> first.</p>
      </body>
      </html>
    `);
  }

  // Serve raw HTML to execute in the browser context of the helper origin
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Allow iframe embedding from other origins if needed for testing
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.send(row.html_content);
});

module.exports = router;

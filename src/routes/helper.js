const express = require('express');
const router = express.Router();
const { db } = require('../db');
const config = require('../config');

const MAX_DOCUMENT_SIZE = 10 * 1024; // 10 KB limit

// View & Management page for Challenge Helper documents
router.get('/', (req, res) => {
  const teamId = req.query.team_id ? String(req.query.team_id).trim() : '';
  const savedUrl = req.query.saved ? `${config.helperHost}/helper/${encodeURIComponent(teamId)}` : null;
  const error = req.query.error ? String(req.query.error) : null;

  let htmlContent = '';
  if (teamId) {
    const row = db.prepare('SELECT html_content FROM helpers WHERE team_id = ?').get(teamId);
    if (row) htmlContent = row.html_content;
  }

  res.render('helper', {
    teamId,
    htmlContent,
    savedUrl,
    error,
    helperHost: config.helperHost
  });
});

// Save or update an HTML document
router.post('/', (req, res) => {
  const teamId = req.body.team_id ? String(req.body.team_id).trim() : '';
  const htmlContent = req.body.html_content !== undefined ? String(req.body.html_content) : '';

  // Validate teamId format
  const teamIdRegex = /^[a-zA-Z0-9_-]{1,40}$/;
  if (!teamIdRegex.test(teamId)) {
    return res.render('helper', {
      teamId: '',
      htmlContent,
      savedUrl: null,
      error: 'Invalid Team ID. Use only letters, numbers, hyphens, and underscores (max 40 chars).',
      helperHost: config.helperHost
    });
  }

  // Validate size limit (10 KB)
  const byteLength = Buffer.byteLength(htmlContent, 'utf8');
  if (byteLength > MAX_DOCUMENT_SIZE) {
    return res.render('helper', {
      teamId,
      htmlContent,
      savedUrl: null,
      error: `Document too large (${byteLength} bytes). Maximum is 10,240 bytes.`,
      helperHost: config.helperHost
    });
  }

  // Parameterized upsert
  db.prepare(`
    INSERT INTO helpers (team_id, html_content, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(team_id) DO UPDATE SET
      html_content = excluded.html_content,
      updated_at = CURRENT_TIMESTAMP
  `).run(teamId, htmlContent);

  res.redirect(`/helper?team_id=${encodeURIComponent(teamId)}&saved=1`);
});

// Serve raw HTML for the given team_id (must be served from separate origin)
router.get('/:teamId', (req, res) => {
  const teamId = String(req.params.teamId).trim();
  const row = db.prepare('SELECT html_content FROM helpers WHERE team_id = ?').get(teamId);

  if (!row) {
    return res.status(404).type('text/html').send(`
      <!DOCTYPE html>
      <html>
      <head><title>Helper Page Not Found</title></head>
      <body style="font-family: sans-serif; padding: 2rem;">
        <h2>No helper document found for team: <code>${teamId.replace(/[<>]/g, '')}</code></h2>
        <p>Save your HTML exploit document at <a href="${config.helperHost}/helper">/helper</a> first.</p>
      </body>
      </html>
    `);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'ALLOWALL');
  res.send(row.html_content);
});

module.exports = router;

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = process.env.DATA_DIR || path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'ctf_xss_lab.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for performance and concurrency
db.pragma('journal_mode = WAL');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      author TEXT NOT NULL,
      website TEXT DEFAULT '',
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS helpers (
      team_id TEXT PRIMARY KEY,
      html_content TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function seedData() {
  const count = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
  if (count === 0) {
    const insertPost = db.prepare(
      'INSERT INTO posts (id, title, content, author) VALUES (?, ?, ?, ?)'
    );

    insertPost.run(
      1,
      'Exploring Modern Web Application Security',
      'Cross-Site Scripting (XSS) remains one of the most prevalent vulnerabilities in modern web applications. Understanding context and proper output encoding is essential for defense.',
      'Alice Security'
    );

    insertPost.run(
      2,
      'The Evolution of Frontend Frameworks and DOM Sinks',
      'While frameworks like React and Vue provide built-in defenses against HTML injection, direct DOM manipulations using methods like innerHTML or document.write can reintroduce critical flaws.',
      'Bob Researcher'
    );

    insertPost.run(
      3,
      'Client-side Routing and URL Hash Events',
      'Modern single-page applications often listen for the hashchange event to navigate between different views or scroll smoothly to sections without requiring a full page refresh.',
      'Eve Navigator'
    );

    insertPost.run(
      4,
      'Securing Legacy Libraries and Selectors',
      'Older JavaScript libraries like jQuery 1.8.x had selector parsing behaviors that could unintentionally evaluate HTML strings when unvalidated inputs were passed to the selector engine.',
      'Dan Developer'
    );

    const insertComment = db.prepare(
      'INSERT INTO comments (post_id, author, website, content) VALUES (?, ?, ?, ?)'
    );

    insertComment.run(
      1,
      'Charlie',
      'https://example.com',
      'Great introduction! Looking forward to part two.'
    );
    insertComment.run(
      1,
      'Dave',
      '',
      'Contextual encoding is definitely the key to preventing reflected attacks.'
    );
  }
}

function resetDatabase() {
  db.exec(`
    DROP TABLE IF EXISTS helpers;
    DROP TABLE IF EXISTS comments;
    DROP TABLE IF EXISTS posts;
  `);
  initSchema();
  seedData();
}

initSchema();
seedData();

module.exports = {
  db,
  resetDatabase
};

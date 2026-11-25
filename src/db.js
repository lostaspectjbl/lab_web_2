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
      slug TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'Research',
      excerpt TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      author TEXT NOT NULL,
      author_key TEXT NOT NULL DEFAULT 'a',
      read_time INTEGER NOT NULL DEFAULT 5,
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
      `INSERT INTO posts (id, title, slug, category, excerpt, content, author, author_key, read_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    insertPost.run(
      1,
      'Understanding Output Encoding: Why Context Is Everything',
      'understanding-output-encoding',
      'Research',
      'Output encoding is the single most important defense against injection attacks. But encoding the wrong thing in the wrong context can give you a false sense of security.',
      `Output encoding is the single most important defense against injection attacks. But encoding the wrong thing in the wrong context can give you a false sense of security — and leave real attack surfaces wide open.

<h2>The Four Contexts</h2>

<p>When user-supplied data is reflected back in an HTTP response, it always lands in one of four contexts: HTML body, HTML attribute, JavaScript, or URL. Each context has its own injection characters and its own encoding rules.</p>

<ul>
  <li><strong>HTML body context</strong> — Characters <code>&amp;</code>, <code>&lt;</code>, <code>&gt;</code>, <code>"</code>, and <code>'</code> must all be entity-encoded.</li>
  <li><strong>HTML attribute context</strong> — Angle brackets alone are not enough. If a value lands inside a quoted attribute, the matching quote character must be encoded too. Unquoted attributes are even more dangerous.</li>
  <li><strong>JavaScript string context</strong> — Entity encoding does nothing here. You need to escape backslash, single quote, double quote, and newline characters using their JavaScript escape sequences.</li>
  <li><strong>URL context</strong> — Use percent-encoding for every character that is not a safe URL character. Critically, never allow an untrusted value to form the scheme portion of a URL.</li>
</ul>

<h2>Where Developers Go Wrong</h2>

<p>The most common mistake is applying HTML entity encoding universally, then assuming the application is safe. Consider a search term that is reflected into a JavaScript variable:</p>

<pre>var query = '&lt;%= userInput %&gt;';</pre>

<p>If the template engine HTML-encodes angle brackets, an attacker cannot inject <code>&lt;script&gt;</code> tags — but they can still break out of the string literal with a simple single quote. HTML encoding is irrelevant inside a JavaScript string; you need JavaScript-aware escaping.</p>

<h2>Defense in Depth</h2>

<p>Sound output encoding is a complement to, not a replacement for, a strict Content Security Policy. Use both. And wherever possible, prefer frameworks that handle context-aware encoding automatically — but always verify that automatic encoding is actually active in every render path.</p>`,
      'Alice Chen',
      'a',
      7
    );

    insertPost.run(
      2,
      'Stored vs. Reflected XSS: Attack Persistence and Impact',
      'stored-vs-reflected-xss',
      'Tutorial',
      'Both stored and reflected XSS let an attacker run JavaScript in a victim\'s browser. The difference is in how the payload gets there — and that difference changes the attack\'s reach dramatically.',
      `Both stored and reflected XSS let an attacker run JavaScript in a victim's browser. The difference is in how the payload gets there — and that difference changes the attack's reach dramatically.

<h2>Reflected XSS</h2>

<p>In a reflected attack, the malicious payload is embedded in a URL. The server receives the request, includes the unencoded input somewhere in the response HTML, and sends it back. The victim's browser parses the response and executes the injected script.</p>

<p>The key limitation is delivery: the victim must click a crafted link. This makes phishing the primary delivery vector. Reflected XSS is powerful in targeted attacks but requires social engineering to reach victims at scale.</p>

<h2>Stored XSS</h2>

<p>Stored XSS is more dangerous because the payload is persisted. An attacker submits malicious content — a comment, a profile field, a product review — and the server saves it to a database. Every user who subsequently loads that content is attacked automatically, without any further action from the attacker.</p>

<p>A single stored payload in a high-traffic section of a site (a news feed, a shared inbox, an admin panel) can compromise thousands of accounts simultaneously. It scales without ongoing effort from the attacker.</p>

<h2>Impact in Both Cases</h2>

<p>Regardless of delivery mechanism, the impact is the same: the injected script runs with full access to the page's origin. It can:</p>

<ul>
  <li>Read and exfiltrate cookies (if not HttpOnly)</li>
  <li>Capture keystrokes and form input</li>
  <li>Make authenticated requests on behalf of the victim</li>
  <li>Modify the DOM to display phishing content</li>
  <li>Establish a persistent backdoor via service workers</li>
</ul>

<h2>Detection</h2>

<p>Reflected XSS is best found through automated scanning of every input parameter. Stored XSS requires testing every output point that could render previously submitted data. Manual review of data flow is essential — automated tools miss stored sinks that only appear under specific conditions.</p>`,
      'Marcus Webb',
      'b',
      8
    );

    insertPost.run(
      3,
      'DOM-Based XSS: When the Server Never Sees the Attack',
      'dom-based-xss-explained',
      'Research',
      'DOM-based XSS is fundamentally different from its server-side cousins. The server sends a perfectly safe response — but client-side JavaScript processes attacker-controlled data and writes it into the DOM without sanitization.',
      `DOM-based XSS is fundamentally different from its server-side cousins. The server sends a perfectly safe response — but client-side JavaScript processes attacker-controlled data and writes it into the DOM without sanitization.

<h2>Sources and Sinks</h2>

<p>To understand DOM XSS, you need two concepts: <strong>sources</strong> and <strong>sinks</strong>.</p>

<p>A <strong>source</strong> is any JavaScript property that an attacker can influence. The most common sources are:</p>

<ul>
  <li><code>location.search</code> — the query string</li>
  <li><code>location.hash</code> — the fragment identifier</li>
  <li><code>location.href</code> — the full URL</li>
  <li><code>document.referrer</code> — the referring page</li>
  <li><code>window.name</code> — the browsing context name</li>
</ul>

<p>A <strong>sink</strong> is a JavaScript function or property that can cause code execution when given attacker-controlled data. Dangerous sinks include:</p>

<ul>
  <li><code>element.innerHTML</code> and <code>element.outerHTML</code></li>
  <li><code>document.write()</code> and <code>document.writeln()</code></li>
  <li><code>eval()</code>, <code>setTimeout()</code>, <code>setInterval()</code> with string arguments</li>
  <li>jQuery <code>.html()</code> and <code>.append()</code></li>
  <li>jQuery's selector engine when passed HTML strings</li>
</ul>

<h2>Why It's Hard to Detect</h2>

<p>Traditional server-side scanning tools and WAFs are blind to DOM XSS. The vulnerable code is in the response JavaScript, and the attack payload may never reach the server at all — particularly when the source is <code>location.hash</code>, which browsers do not send in HTTP requests.</p>

<p>Effective detection requires dynamic analysis: running a browser and observing what client-side code does with attacker-controlled inputs.</p>

<h2>Mitigation</h2>

<p>The core fix is to treat client-side data with the same mistrust as server-side data. Use safe DOM APIs — <code>element.textContent</code> instead of <code>innerHTML</code>, <code>element.setAttribute</code> for attributes — and validate URL schemes before assigning to <code>href</code>. For legacy code using <code>document.write</code>, refactor to modern DOM methods.</p>`,
      'Alice Chen',
      'a',
      9
    );

    insertPost.run(
      4,
      'The jQuery Legacy Trap: Selector Injection in Older Versions',
      'jquery-selector-injection',
      'Analysis',
      'jQuery 1.x\'s selector engine had an underappreciated quirk: when you passed a string beginning with an HTML tag to the $ function, it parsed it as HTML rather than treating it as a CSS selector. This behavior enabled a class of attacks that persist in any codebase that never updated.',
      `jQuery 1.x's selector engine had an underappreciated quirk: when you passed a string beginning with an HTML tag to the <code>$</code> function, it parsed it as HTML rather than treating it as a CSS selector. This behavior enabled a class of attacks that persist in any codebase that never updated.

<h2>How the Selector Engine Works</h2>

<p>When jQuery receives a string argument to <code>$()</code>, it must decide whether to treat it as a CSS selector or as HTML to parse and inject. In jQuery 1.8.x, the heuristic was simple: if the string starts with <code>&lt;</code>, treat it as HTML. Otherwise, run it through the CSS selector engine.</p>

<p>This seems safe — but the attack vector is different. Consider code that constructs a selector from user input:</p>

<pre>var target = $('h2:contains(' + location.hash.slice(1) + ')');</pre>

<p>The intent is to find an <code>h2</code> element whose text matches the hash. But if the hash value is <code>&lt;img src=x onerror=alert(1)&gt;</code>, the entire constructed string starts with the selector prefix — however, the jQuery 1.x <code>:contains()</code> parser is not bulletproofed against injected HTML in later versions, and the passed string being used in <code>$()</code> can still trigger HTML parsing paths depending on library version.</p>

<h2>The Fix</h2>

<p>jQuery 3.x made the heuristic more conservative. Modern jQuery requires the HTML string to match a stricter pattern before treating it as markup. More importantly, modern code should never construct selectors from user input at all. Use data attributes and <code>document.querySelector</code> with literal selectors instead.</p>

<h2>Auditing Legacy Codebases</h2>

<p>When auditing code that uses jQuery 1.x or 2.x, grep for every occurrence of <code>$(</code> and examine what values reach the selector engine. Pay special attention to <code>location.hash</code>, URL parameters read via jQuery plugins, and any template variable interpolated into a selector string.</p>`,
      'David Okafor',
      'd',
      7
    );

    insertPost.run(
      5,
      'Content Security Policy: A Practical Implementation Guide',
      'content-security-policy-guide',
      'Tutorial',
      'Content Security Policy is one of the most effective mitigations against XSS — but a misconfigured CSP provides almost no protection. This guide walks through building a strict, effective policy from scratch.',
      `Content Security Policy is one of the most effective mitigations against XSS — but a misconfigured CSP provides almost no protection. This guide walks through building a strict, effective policy from scratch.

<h2>Start Strict, Relax as Needed</h2>

<p>The most common CSP mistake is starting with an overly permissive policy and trying to tighten it later. Instead, start with the most restrictive possible policy and loosen it only when you have a specific, understood reason.</p>

<p>A minimal starting point for a modern single-page application:</p>

<pre>Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'self';</pre>

<h2>Avoid unsafe-inline</h2>

<p><code>unsafe-inline</code> in <code>script-src</code> completely undermines XSS protection. If your application uses inline scripts, the right fix is to move them to external files or use nonce-based CSP. A nonce is a random token generated per-request; inline scripts are allowed only when they carry the matching nonce attribute.</p>

<h2>The unsafe-eval Problem</h2>

<p><code>unsafe-eval</code> allows <code>eval()</code>, <code>Function()</code>, and similar dynamic code execution. Many JavaScript frameworks and libraries require it — but modern versions of Angular, React, and Vue all support strict mode without eval. If you need eval, audit exactly why before allowing it globally.</p>

<h2>Reporting</h2>

<p>Use <code>Content-Security-Policy-Report-Only</code> before switching to enforcement mode. Configure a <code>report-uri</code> or <code>report-to</code> endpoint to collect violations in production. This surfaces both attacks and legitimate policy gaps without breaking the site.</p>`,
      'Sarah Kim',
      'e',
      11
    );

    insertPost.run(
      6,
      'Penetration Testing Web Applications: Where to Begin',
      'penetration-testing-web-apps',
      'Tutorial',
      'Web application penetration testing is a disciplined process, not a random search for vulnerabilities. This article outlines a structured methodology that professional testers use to find and document security issues.',
      `Web application penetration testing is a disciplined process, not a random search for vulnerabilities. This article outlines a structured methodology that professional testers use to find and document security issues.

<h2>Reconnaissance and Mapping</h2>

<p>Before testing a single input, map the application thoroughly. Identify every page, parameter, and functionality. Use a proxy (Burp Suite or ZAP) to capture all traffic. Document the technology stack, authentication mechanisms, session management approach, and third-party integrations.</p>

<p>Pay special attention to:</p>
<ul>
  <li>All points where user input enters the application</li>
  <li>All points where data from the database or external sources is rendered</li>
  <li>Client-side JavaScript that processes URL parameters or other attacker-controlled sources</li>
  <li>File upload and download functionality</li>
</ul>

<h2>Prioritize by Risk</h2>

<p>Not all inputs are equal. Focus first on inputs that reach high-impact sinks: database queries, file system operations, HTML output, and external service calls. A reflected value in an obscure error message is lower priority than a stored value in a feed that every logged-in user sees.</p>

<h2>Document Everything</h2>

<p>A penetration test is only as useful as its report. For every finding, capture: the affected URL and parameter, the proof-of-concept payload, the reproduction steps, the potential impact, and a clear remediation recommendation. Screenshots and HTTP request/response pairs are essential evidence.</p>`,
      'Marcus Webb',
      'b',
      8
    );

    // Seed comments
    const insertComment = db.prepare(
      'INSERT INTO comments (post_id, author, website, content) VALUES (?, ?, ?, ?)'
    );

    insertComment.run(1, 'Rafael Torres', 'https://rafaeltorres.dev', 'Excellent breakdown. The JavaScript context encoding is the one developers most often forget about.');
    insertComment.run(1, 'Priya Nair', '', 'The table of contexts vs. encoding rules would make a great cheat sheet. Any chance of a printable version?');
    insertComment.run(1, 'Jonas Eriksson', 'https://eriksson.io', 'I just audited three projects this week where innerHTML was used with no sanitization. This is a real epidemic.');

    insertComment.run(2, 'Anika Osei', '', 'The scale difference between reflected and stored XSS is something I always struggle to explain to clients. This framing helps a lot.');
    insertComment.run(2, 'Chen Wei', 'https://chenwei.me', 'Worth adding: stored XSS is especially dangerous in admin panels because attackers can compromise highly privileged accounts without direct interaction.');

    insertComment.run(3, 'Lena Schmidt', '', 'The source/sink model is so clean. First time reading it explained this clearly.');
    insertComment.run(3, 'Yusuf Al-Rashid', 'https://yusuf.sec', 'Key takeaway for me: location.hash never reaches the server, so server-side WAFs are completely useless against hash-based DOM XSS.');

    insertComment.run(4, 'Fatima Hassan', '', 'We have a 10-year-old codebase still running jQuery 1.6. This article just became required reading for the whole team.');
    insertComment.run(4, 'Owen Clark', 'https://owenclark.dev', 'The grep tip is gold. I would add: also search for .attr(\'href\', and .attr(\'src\', with variable arguments.');

    insertComment.run(5, 'Mei Lin', 'https://meilin.io', 'The nonce approach changed our entire CSP strategy. Went from unsafe-inline to strict nonces in one sprint.');
    insertComment.run(5, 'Tomasz Kowalski', '', 'Report-Only mode saved us from a broken deployment more than once. Cannot recommend it enough for CSP rollouts.');

    insertComment.run(6, 'Isabela Ferreira', 'https://isabela.sec', 'The proxy-first approach is so important. So many testers jump straight to fuzzing without understanding the application first.');
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

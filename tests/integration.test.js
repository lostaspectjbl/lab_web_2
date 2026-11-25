const http = require('http');
const { app, helperApp } = require('../src/server');

const MAIN_PORT = 3998;
const HELPER_PORT = 3997;

/**
 * Make an HTTP request, optionally sending a Cookie header and returning
 * set-cookie from the response so callers can maintain a session across calls.
 */
function makeRequest(port, path, method = 'GET', body = null, cookieHeader = '') {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: {}
    };

    if (cookieHeader) options.headers['Cookie'] = cookieHeader;

    let payload = null;
    if (body) {
      payload = new URLSearchParams(body).toString();
      options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/** Extract the value of a named cookie from a set-cookie header array. */
function extractCookie(setCookieArr, name) {
  if (!setCookieArr) return '';
  for (const c of setCookieArr) {
    const match = c.match(new RegExp(`^${name}=([^;]+)`));
    if (match) return `${name}=${match[1]}`;
  }
  return '';
}

/** Build a Cookie header string from multiple set-cookie responses. */
function buildCookieJar(...setCookieArrays) {
  const jar = {};
  for (const arr of setCookieArrays) {
    if (!arr) continue;
    for (const c of arr) {
      const pair = c.split(';')[0];
      const [name, value] = pair.split('=');
      if (name && value !== undefined) jar[name.trim()] = value.trim();
    }
  }
  return Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
}

const mainServer = app.listen(MAIN_PORT, '127.0.0.1', () => {
  const helperServer = helperApp.listen(HELPER_PORT, '127.0.0.1', async () => {
    console.log(`[TEST] Main server on port ${MAIN_PORT}, Helper server on port ${HELPER_PORT}`);

    try {
      // ── 1. Health check ────────────────────────────────────────────────────
      const resHealth = await makeRequest(MAIN_PORT, '/health');
      if (resHealth.status !== 200) throw new Error('Health check failed');
      console.log('✓ Health check passed');

      // ── 2. Homepage ────────────────────────────────────────────────────────
      const resHome = await makeRequest(MAIN_PORT, '/');
      if (resHome.status !== 200 || !resHome.body.includes('ByteNote')) {
        throw new Error('Homepage failed or missing blog identity');
      }
      console.log('✓ Homepage (ByteNote blog) passed');

      // ── 3. Lab 01 — Reflected XSS into HTML context ────────────────────────
      const resLab01 = await makeRequest(MAIN_PORT, '/lab01?search=%3Cscript%3Ealert(1)%3C%2Fscript%3E');
      if (resLab01.status !== 200 || !resLab01.body.includes('<script>alert(1)</script>')) {
        throw new Error('Lab 01 unencoded payload missing');
      }
      if (!resLab01.headers['set-cookie'] || !resLab01.headers['set-cookie'].some(c => c.includes('flag='))) {
        throw new Error('Lab 01 flag cookie missing');
      }
      console.log('✓ Lab 01 Reflected XSS verified');

      // ── 4. Lab 02 — Stored XSS (per-session isolation) ────────────────────
      // Step 1: Visit lab02 to establish a session
      const resLab02Init = await makeRequest(MAIN_PORT, '/lab02');
      const lab02Cookie = buildCookieJar(resLab02Init.headers['set-cookie']);

      // Step 2: POST comment within that session
      await makeRequest(MAIN_PORT, '/lab02/comment', 'POST',
        { author: 'Attacker', content: '<img src=x onerror=alert(2)>' },
        lab02Cookie
      );

      // Step 3: GET lab02 with same session — payload must appear
      const resLab02 = await makeRequest(MAIN_PORT, '/lab02', 'GET', null, lab02Cookie);
      if (!resLab02.body.includes('<img src=x onerror=alert(2)>')) {
        throw new Error('Lab 02 stored payload missing in same session');
      }
      if (!resLab02.headers['set-cookie'] || !resLab02.headers['set-cookie'].some(c => c.includes('flag='))) {
        throw new Error('Lab 02 flag cookie missing');
      }

      // Step 4: Different session must NOT see the payload
      const resLab02Other = await makeRequest(MAIN_PORT, '/lab02');
      if (resLab02Other.body.includes('<img src=x onerror=alert(2)>')) {
        throw new Error('Lab 02 session isolation FAILED — payload visible to other sessions');
      }
      console.log('✓ Lab 02 Stored XSS verified (per-session isolation confirmed)');

      // ── 5. Lab 03 — DOM XSS via document.write ────────────────────────────
      const resLab03 = await makeRequest(MAIN_PORT, '/lab03?search=test');
      if (resLab03.status !== 200 || !resLab03.body.includes('document.write(')) {
        throw new Error('Lab 03 document.write sink missing');
      }
      if (!resLab03.headers['set-cookie'] || !resLab03.headers['set-cookie'].some(c => c.includes('flag='))) {
        throw new Error('Lab 03 flag cookie missing');
      }
      console.log('✓ Lab 03 DOM XSS (document.write) verified');

      // ── 6. Lab 04 — DOM XSS via innerHTML ────────────────────────────────
      const resLab04 = await makeRequest(MAIN_PORT, '/lab04?search=test');
      if (resLab04.status !== 200 || !resLab04.body.includes('.innerHTML =')) {
        throw new Error('Lab 04 innerHTML sink missing');
      }
      if (!resLab04.headers['set-cookie'] || !resLab04.headers['set-cookie'].some(c => c.includes('flag='))) {
        throw new Error('Lab 04 flag cookie missing');
      }
      console.log('✓ Lab 04 DOM XSS (innerHTML) verified');

      // ── 7. Lab 05 — DOM XSS in jQuery anchor href ─────────────────────────
      const resLab05 = await makeRequest(MAIN_PORT, '/lab05');
      if (resLab05.status !== 200 || !resLab05.body.includes("$('#backLink').attr('href', returnPath)")) {
        throw new Error('Lab 05 jQuery attr sink missing');
      }
      if (!resLab05.headers['set-cookie'] || !resLab05.headers['set-cookie'].some(c => c.includes('flag='))) {
        throw new Error('Lab 05 flag cookie missing');
      }
      console.log('✓ Lab 05 DOM XSS (jQuery attr href) verified');

      // ── 8. Lab 06 — DOM XSS in jQuery selector on hashchange ──────────────
      const resLab06 = await makeRequest(MAIN_PORT, '/lab06');
      if (resLab06.status !== 200 || !resLab06.body.includes('hashchange') || !resLab06.body.includes('h2:contains(')) {
        throw new Error('Lab 06 hashchange / selector sink missing');
      }
      if (!resLab06.headers['set-cookie'] || !resLab06.headers['set-cookie'].some(c => c.includes('flag='))) {
        throw new Error('Lab 06 flag cookie missing');
      }
      console.log('✓ Lab 06 DOM XSS (jQuery selector hashchange) verified');

      // ── 9. Lab 07 — Reflected XSS into attribute (< > encoded, quotes not) ─
      const rawPayload07 = '" onfocus="alert(7)" autofocus="';
      const resLab07 = await makeRequest(MAIN_PORT, `/lab07?search=${encodeURIComponent(rawPayload07)}`);
      if (resLab07.status !== 200) throw new Error('Lab 07 failed');
      if (!resLab07.body.includes('value="" onfocus="alert(7)" autofocus=""')) {
        throw new Error('Lab 07 attribute quote breakout failed');
      }
      if (!resLab07.headers['set-cookie'] || !resLab07.headers['set-cookie'].some(c => c.includes('flag='))) {
        throw new Error('Lab 07 flag cookie missing');
      }
      const resLab07B = await makeRequest(MAIN_PORT, '/lab07?search=<script>');
      if (resLab07B.body.includes('value="<script>"')) {
        throw new Error('Lab 07 failed to encode angle brackets');
      }
      console.log('✓ Lab 07 Reflected attribute XSS (< > encoded, quotes unhandled) verified');

      // ── 10. Lab 08 — Stored XSS in href (per-session isolation) ───────────
      const resLab08Init = await makeRequest(MAIN_PORT, '/lab08');
      const lab08Cookie = buildCookieJar(resLab08Init.headers['set-cookie']);

      await makeRequest(MAIN_PORT, '/lab08/comment', 'POST',
        { author: 'MaliciousAuthor', website: 'javascript:alert(8)', content: 'Testing stored XSS in href' },
        lab08Cookie
      );

      const resLab08 = await makeRequest(MAIN_PORT, '/lab08', 'GET', null, lab08Cookie);
      if (resLab08.status !== 200) throw new Error('Lab 08 failed');
      if (!resLab08.body.includes('href="javascript:alert(8)"')) {
        throw new Error('Lab 08 javascript: scheme href missing');
      }
      if (!resLab08.headers['set-cookie'] || !resLab08.headers['set-cookie'].some(c => c.includes('flag='))) {
        throw new Error('Lab 08 flag cookie missing');
      }

      const resLab08Other = await makeRequest(MAIN_PORT, '/lab08');
      if (resLab08Other.body.includes('href="javascript:alert(8)"')) {
        throw new Error('Lab 08 session isolation FAILED — payload visible to other sessions');
      }
      console.log('✓ Lab 08 Stored anchor href XSS (javascript: scheme, per-session isolation) verified');

      // ── 11. Lab 09 — Reflected XSS into JS string ─────────────────────────
      const rawPayload09 = "';alert(9);//";
      const resLab09 = await makeRequest(MAIN_PORT, `/lab09?search=${encodeURIComponent(rawPayload09)}`);
      if (resLab09.status !== 200) throw new Error('Lab 09 failed');
      if (!resLab09.body.includes("var searchTerms = '';alert(9);//';")) {
        throw new Error('Lab 09 JS string breakout failed');
      }
      if (!resLab09.headers['set-cookie'] || !resLab09.headers['set-cookie'].some(c => c.includes('flag='))) {
        throw new Error('Lab 09 flag cookie missing');
      }
      console.log('✓ Lab 09 Reflected JS string XSS (< > encoded, quotes unhandled) verified');

      // ── 12. Lab 10 — DOM XSS in document.write inside select ──────────────
      const resLab10 = await makeRequest(MAIN_PORT, '/lab10');
      if (resLab10.status !== 200) throw new Error('Lab 10 failed');
      if (!resLab10.body.includes('<select name="storeId"') || !resLab10.body.includes('document.write(')) {
        throw new Error('Lab 10 select document.write sink missing');
      }
      if (!resLab10.headers['set-cookie'] || !resLab10.headers['set-cookie'].some(c => c.includes('flag='))) {
        throw new Error('Lab 10 flag cookie missing');
      }
      console.log('✓ Lab 10 DOM XSS in select element (document.write) verified');

      // ── 13. Challenge Helper (separate origin) ─────────────────────────────
      const resSaveHelper = await makeRequest(HELPER_PORT, '/helper', 'POST', {
        team_id: 'team_red',
        html_content: '<html><body>Exploit Test</body></html>'
      });
      if (resSaveHelper.status !== 302) throw new Error(`Helper save failed: HTTP ${resSaveHelper.status}`);
      const resGetHelper = await makeRequest(HELPER_PORT, '/helper/team_red');
      if (!resGetHelper.headers['content-type'] || !resGetHelper.headers['content-type'].includes('text/html')) {
        throw new Error('Helper Content-Type mismatch');
      }
      if (!resGetHelper.body.includes('Exploit Test')) {
        throw new Error('Helper served content mismatch');
      }
      console.log('✓ Challenge Helper (separate origin, text/html) verified');

      // ── 14. Per-session reset ──────────────────────────────────────────────
      // Reset lab02's session and confirm payload is gone
      await makeRequest(MAIN_PORT, '/lab02/reset', 'POST', {}, lab02Cookie);
      const resLab02AfterReset = await makeRequest(MAIN_PORT, '/lab02', 'GET', null, lab02Cookie);
      if (resLab02AfterReset.body.includes('<img src=x onerror=alert(2)>')) {
        throw new Error('Per-session reset failed for Lab 02');
      }
      console.log('✓ Per-session reset endpoint verified');

      // ── 15. Global reset ──────────────────────────────────────────────────
      // Re-insert a lab08 payload then global-reset, verify it's gone
      await makeRequest(MAIN_PORT, '/lab08/comment', 'POST',
        { author: 'X', website: 'javascript:alert(8)', content: 'x' },
        lab08Cookie
      );
      await makeRequest(MAIN_PORT, '/reset', 'POST', {});
      const resLab08AfterGlobal = await makeRequest(MAIN_PORT, '/lab08', 'GET', null, lab08Cookie);
      if (resLab08AfterGlobal.body.includes('href="javascript:alert(8)"')) {
        throw new Error('Global reset failed to clear Lab 08 comments');
      }
      console.log('✓ Global database reset endpoint verified');

      console.log('\n[SUCCESS] All 15 tests passed.');
      mainServer.close();
      helperServer.close();
      process.exit(0);
    } catch (err) {
      console.error('\n[FAIL] Test assertion failed:', err.message);
      mainServer.close();
      helperServer.close();
      process.exit(1);
    }
  });
});

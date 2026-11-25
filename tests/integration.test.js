const http = require('http');
const { app, helperApp } = require('../src/server');

const MAIN_PORT = 3998;
const HELPER_PORT = 3997;

function makeRequest(port, path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: port,
      path: path,
      method: method
    };

    let payload = null;
    if (body) {
      payload = new URLSearchParams(body).toString();
      options.headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload)
      };
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

const mainServer = app.listen(MAIN_PORT, '127.0.0.1', () => {
  const helperServer = helperApp.listen(HELPER_PORT, '127.0.0.1', async () => {
    console.log(`[TEST] Main server running on port ${MAIN_PORT}, Helper server on port ${HELPER_PORT}`);

    try {
      // 1. Health check & Dashboard
      const resHealth = await makeRequest(MAIN_PORT, '/health');
      if (resHealth.status !== 200) throw new Error('Health check failed');
      console.log('✓ Health check passed');

      const resHome = await makeRequest(MAIN_PORT, '/');
      if (resHome.status !== 200 || !resHome.body.includes('Lab 10') || !resHome.body.includes('Challenge Helper Page')) {
        throw new Error('Home dashboard incomplete');
      }
      console.log('✓ Dashboard navigation with all 10 Labs & Helper passed');

      // 2. Lab 01 (Reflected XSS into HTML context)
      const resLab01 = await makeRequest(MAIN_PORT, '/lab01?search=%3Cscript%3Ealert(1)%3C%2Fscript%3E');
      if (resLab01.status !== 200 || !resLab01.body.includes('<script>alert(1)</script>')) {
        throw new Error('Lab 01 unencoded payload missing');
      }
      if (!resLab01.headers['set-cookie'] || !resLab01.headers['set-cookie'][0].includes('flag=')) {
        throw new Error('Lab 01 flag cookie missing');
      }
      console.log('✓ Lab 01 Reflected XSS verified');

      // 3. Lab 02 (Stored XSS into HTML context)
      await makeRequest(MAIN_PORT, '/lab02/comment', 'POST', {
        postId: 1,
        author: 'Attacker',
        content: '<img src=x onerror=alert(2)>'
      });
      const resLab02 = await makeRequest(MAIN_PORT, '/lab02');
      if (!resLab02.body.includes('<img src=x onerror=alert(2)>')) throw new Error('Lab 02 stored payload missing');
      if (!resLab02.headers['set-cookie'] || !resLab02.headers['set-cookie'][0].includes('flag=')) {
        throw new Error('Lab 02 flag cookie missing');
      }
      console.log('✓ Lab 02 Stored XSS verified');

      // 4. Lab 03 (DOM XSS in document.write)
      const resLab03 = await makeRequest(MAIN_PORT, '/lab03?search=test');
      if (resLab03.status !== 200 || !resLab03.body.includes('document.write(')) {
        throw new Error('Lab 03 document.write sink missing');
      }
      if (!resLab03.headers['set-cookie'] || !resLab03.headers['set-cookie'][0].includes('flag=')) {
        throw new Error('Lab 03 flag cookie missing');
      }
      console.log('✓ Lab 03 DOM XSS (document.write) verified');

      // 5. Lab 04 (DOM XSS in innerHTML)
      const resLab04 = await makeRequest(MAIN_PORT, '/lab04?search=test');
      if (resLab04.status !== 200 || !resLab04.body.includes('.innerHTML =')) {
        throw new Error('Lab 04 innerHTML sink missing');
      }
      if (!resLab04.headers['set-cookie'] || !resLab04.headers['set-cookie'][0].includes('flag=')) {
        throw new Error('Lab 04 flag cookie missing');
      }
      console.log('✓ Lab 04 DOM XSS (innerHTML) verified');

      // 6. Lab 05 (DOM XSS in jQuery anchor href)
      const resLab05 = await makeRequest(MAIN_PORT, '/lab05');
      if (resLab05.status !== 200 || !resLab05.body.includes("$('#backLink').attr('href', returnPath)")) {
        throw new Error('Lab 05 jQuery attr sink missing');
      }
      if (!resLab05.headers['set-cookie'] || !resLab05.headers['set-cookie'][0].includes('flag=')) {
        throw new Error('Lab 05 flag cookie missing');
      }
      console.log('✓ Lab 05 DOM XSS (jQuery attr href) verified');

      // 7. Lab 06 (DOM XSS in jQuery selector on hashchange)
      const resLab06 = await makeRequest(MAIN_PORT, '/lab06');
      if (resLab06.status !== 200 || !resLab06.body.includes('hashchange') || !resLab06.body.includes('h2:contains(')) {
        throw new Error('Lab 06 hashchange / selector sink missing');
      }
      if (!resLab06.headers['set-cookie'] || !resLab06.headers['set-cookie'][0].includes('flag=')) {
        throw new Error('Lab 06 flag cookie missing');
      }
      console.log('✓ Lab 06 DOM XSS (jQuery selector hashchange) verified');

      // 8. Challenge Helper Page
      const resSaveHelper = await makeRequest(HELPER_PORT, '/helper/save', 'POST', {
        teamId: 'team_red',
        htmlContent: '<html><body>Exploit Test</body></html>'
      });
      if (resSaveHelper.status !== 302) throw new Error('Helper save failed');
      const resGetHelper = await makeRequest(HELPER_PORT, '/helper/team_red');
      if (!resGetHelper.headers['content-type'].includes('text/html')) {
        throw new Error('Helper Content-Type mismatch');
      }
      console.log('✓ Challenge Helper Page (Origin terpisah & text/html) verified');

      // 9. Lab 07 (Reflected XSS into attribute with angle brackets encoded)
      const rawPayload07 = '" onfocus="alert(7)" autofocus="';
      const resLab07 = await makeRequest(MAIN_PORT, `/lab07?search=${encodeURIComponent(rawPayload07)}`);
      if (resLab07.status !== 200) throw new Error('Lab 07 failed');
      if (!resLab07.body.includes('value="" onfocus="alert(7)" autofocus=""')) {
        throw new Error('Lab 07 attribute quote breakout failed');
      }
      if (!resLab07.headers['set-cookie'] || !resLab07.headers['set-cookie'][0].includes('flag=')) {
        throw new Error('Lab 07 flag cookie missing');
      }
      // Verify angle brackets are encoded
      const resLab07Brackets = await makeRequest(MAIN_PORT, '/lab07?search=<script>');
      if (resLab07Brackets.body.includes('value="<script>"')) {
        throw new Error('Lab 07 failed to encode angle brackets');
      }
      console.log('✓ Lab 07 Reflected attribute XSS (< > encoded, quotes unhandled) verified');

      // 10. Lab 08 (Stored XSS into anchor href attribute with double quotes encoded)
      await makeRequest(MAIN_PORT, '/lab08/comment', 'POST', {
        postId: 1,
        author: 'MaliciousAuthor',
        website: 'javascript:alert(8)',
        content: 'Testing stored XSS in href'
      });
      const resLab08 = await makeRequest(MAIN_PORT, '/lab08');
      if (resLab08.status !== 200) throw new Error('Lab 08 failed');
      if (!resLab08.body.includes('href="javascript:alert(8)"')) {
        throw new Error('Lab 08 javascript: scheme href missing');
      }
      if (!resLab08.headers['set-cookie'] || !resLab08.headers['set-cookie'][0].includes('flag=')) {
        throw new Error('Lab 08 flag cookie missing');
      }
      console.log('✓ Lab 08 Stored anchor href XSS (javascript: scheme) verified');

      // 11. Lab 09 (Reflected XSS into JavaScript string with angle brackets encoded)
      const rawPayload09 = "';alert(9);//";
      const resLab09 = await makeRequest(MAIN_PORT, `/lab09?search=${encodeURIComponent(rawPayload09)}`);
      if (resLab09.status !== 200) throw new Error('Lab 09 failed');
      if (!resLab09.body.includes("var searchTerms = '';alert(9);//';")) {
        throw new Error('Lab 09 JS string breakout failed');
      }
      if (!resLab09.headers['set-cookie'] || !resLab09.headers['set-cookie'][0].includes('flag=')) {
        throw new Error('Lab 09 flag cookie missing');
      }
      console.log('✓ Lab 09 Reflected JS string XSS (< > encoded, quotes unhandled) verified');

      // 12. Lab 10 (DOM XSS in document.write inside select element)
      const resLab10 = await makeRequest(MAIN_PORT, '/lab10');
      if (resLab10.status !== 200) throw new Error('Lab 10 failed');
      if (!resLab10.body.includes('<select name="storeId"') || !resLab10.body.includes('document.write(')) {
        throw new Error('Lab 10 select document.write sink missing');
      }
      if (!resLab10.headers['set-cookie'] || !resLab10.headers['set-cookie'][0].includes('flag=')) {
        throw new Error('Lab 10 flag cookie missing');
      }
      console.log('✓ Lab 10 DOM XSS in select element (document.write) verified');

      // 13. Test Reset Endpoint (/reset)
      await makeRequest(MAIN_PORT, '/reset', 'POST', {});
      const resLab08Reset = await makeRequest(MAIN_PORT, '/lab08');
      if (resLab08Reset.body.includes('href="javascript:alert(8)"')) {
        throw new Error('Reset failed to clear Lab 08 comments');
      }
      console.log('✓ Database reset endpoint verified for all stored labs');

      console.log('\n[SUCCESS] All verification tests for Labs 01-10 passed successfully.');
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

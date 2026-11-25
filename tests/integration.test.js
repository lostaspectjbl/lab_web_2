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
      if (resHome.status !== 200 || !resHome.body.includes('Lab 06') || !resHome.body.includes('Challenge Helper Page')) {
        throw new Error('Home dashboard incomplete');
      }
      console.log('✓ Dashboard navigation with Lab 06 & Helper passed');

      // 2. Lab 01 (Reflected XSS)
      const resLab01 = await makeRequest(MAIN_PORT, '/lab01?search=%3Cscript%3Ealert(1)%3C%2Fscript%3E');
      if (resLab01.status !== 200) throw new Error('Lab 01 failed');
      if (!resLab01.body.includes('<script>alert(1)</script>')) throw new Error('Lab 01 unencoded payload missing');
      if (!resLab01.headers['set-cookie'] || !resLab01.headers['set-cookie'][0].includes('flag=')) {
        throw new Error('Lab 01 flag cookie missing');
      }
      console.log('✓ Lab 01 Reflected XSS verified');

      // 3. Lab 02 (Stored XSS)
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

      // 4. Reset
      await makeRequest(MAIN_PORT, '/reset', 'POST', {});
      const resReset = await makeRequest(MAIN_PORT, '/lab02');
      if (resReset.body.includes('<img src=x onerror=alert(2)>')) throw new Error('Reset failed');
      console.log('✓ Reset endpoint verified');

      // 5. Lab 03 (DOM XSS in document.write)
      const resLab03 = await makeRequest(MAIN_PORT, '/lab03?search=test');
      if (resLab03.status !== 200 || !resLab03.body.includes('document.write(')) {
        throw new Error('Lab 03 document.write sink missing');
      }
      console.log('✓ Lab 03 DOM XSS (document.write) verified');

      // 6. Lab 04 (DOM XSS in innerHTML)
      const resLab04 = await makeRequest(MAIN_PORT, '/lab04?search=test');
      if (resLab04.status !== 200 || !resLab04.body.includes('.innerHTML =')) {
        throw new Error('Lab 04 innerHTML sink missing');
      }
      console.log('✓ Lab 04 DOM XSS (innerHTML) verified');

      // 7. Lab 05 (DOM XSS in jQuery anchor href)
      const resLab05 = await makeRequest(MAIN_PORT, '/lab05');
      if (resLab05.status !== 200 || !resLab05.body.includes("$('#backLink').attr('href', returnPath)")) {
        throw new Error('Lab 05 jQuery attr sink missing');
      }
      console.log('✓ Lab 05 DOM XSS (jQuery attr href) verified');

      // 8. Lab 06 (DOM XSS in jQuery selector on hashchange)
      const resLab06 = await makeRequest(MAIN_PORT, '/lab06');
      if (resLab06.status !== 200) throw new Error('Lab 06 route failed');
      if (!resLab06.body.includes('hashchange') || !resLab06.body.includes('h2:contains(')) {
        throw new Error('Lab 06 hashchange / selector sink missing');
      }
      if (!resLab06.headers['set-cookie'] || !resLab06.headers['set-cookie'][0].includes('flag=')) {
        throw new Error('Lab 06 flag cookie missing');
      }
      console.log('✓ Lab 06 DOM XSS (jQuery selector hashchange) verified');

      // 9. Challenge Helper Page (Origin terpisah & 10 KB limit)
      // Save valid exploit HTML
      const exploitPayload = '<!DOCTYPE html><html><body><iframe src="http://localhost:3000/lab06#" onload="this.src += \'<img src=x onerror=alert(1)>\'"></iframe></body></html>';
      const resSaveHelper = await makeRequest(HELPER_PORT, '/helper/save', 'POST', {
        teamId: 'team_red',
        htmlContent: exploitPayload
      });
      if (resSaveHelper.status !== 302) throw new Error('Helper save failed');

      // Verify serving raw HTML on helper port
      const resGetHelper = await makeRequest(HELPER_PORT, '/helper/team_red');
      if (resGetHelper.status !== 200) throw new Error('Helper get failed');
      if (!resGetHelper.headers['content-type'].includes('text/html')) {
        throw new Error('Helper did not return text/html Content-Type');
      }
      if (!resGetHelper.body.includes('iframe src="http://localhost:3000/lab06#"')) {
        throw new Error('Helper served HTML mismatch');
      }
      console.log('✓ Challenge Helper Page (Save & Serve text/html) verified');

      // Verify 10 KB limit enforcement
      const oversizedPayload = 'A'.repeat(10241); // 10,241 bytes
      const resOversized = await makeRequest(HELPER_PORT, '/helper/save', 'POST', {
        teamId: 'team_red',
        htmlContent: oversizedPayload
      });
      if (resOversized.status !== 302 || !resOversized.headers['location'].includes('error=size_exceeded')) {
        throw new Error('Helper 10 KB limit was not enforced');
      }
      console.log('✓ Challenge Helper 10 KB size limit verified');

      console.log('\n[SUCCESS] All verification tests passed successfully.');
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

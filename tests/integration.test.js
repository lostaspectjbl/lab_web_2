const http = require('http');
const app = require('../src/server');

const PORT = 3999;
const server = app.listen(PORT, '127.0.0.1', async () => {
  console.log(`[TEST] Test server started on port ${PORT}`);

  function get(path) {
    return new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${PORT}${path}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
      }).on('error', reject);
    });
  }

  function post(path, body) {
    return new Promise((resolve, reject) => {
      const payload = new URLSearchParams(body).toString();
      const req = http.request(`http://127.0.0.1:${PORT}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  try {
    // 1. Test Health & Dashboard
    const resHealth = await get('/health');
    if (resHealth.status !== 200) throw new Error('Health check failed');
    console.log('✓ Health check passed');

    const resHome = await get('/');
    if (resHome.status !== 200 || !resHome.body.includes('Lab 05')) {
      throw new Error('Home dashboard incomplete');
    }
    console.log('✓ Dashboard navigation passed');

    // 2. Test Lab 01 (Reflected XSS)
    const resLab01 = await get('/lab01?search=%3Cscript%3Ealert(1)%3C%2Fscript%3E');
    if (resLab01.status !== 200) throw new Error('Lab 01 failed');
    if (!resLab01.body.includes('<script>alert(1)</script>')) throw new Error('Lab 01 payload not reflected unencoded');
    if (!resLab01.headers['set-cookie'] || !resLab01.headers['set-cookie'][0].includes('flag=')) {
      throw new Error('Lab 01 flag cookie missing');
    }
    console.log('✓ Lab 01 Reflected XSS & flag cookie verified');

    // 3. Test Lab 02 (Stored XSS)
    const resPost = await post('/lab02/comment', {
      postId: 1,
      author: 'Attacker',
      content: '<img src=x onerror=alert(2)>'
    });
    if (resPost.status !== 302) throw new Error('Lab 02 comment submit failed');

    const resLab02 = await get('/lab02');
    if (!resLab02.body.includes('<img src=x onerror=alert(2)>')) throw new Error('Lab 02 stored payload not found');
    if (!resLab02.headers['set-cookie'] || !resLab02.headers['set-cookie'][0].includes('flag=')) {
      throw new Error('Lab 02 flag cookie missing');
    }
    console.log('✓ Lab 02 Stored XSS & flag cookie verified');

    // 4. Test Reset
    await post('/reset', {});
    const resLab02Reset = await get('/lab02');
    if (resLab02Reset.body.includes('<img src=x onerror=alert(2)>')) throw new Error('Reset failed to purge comments');
    console.log('✓ Database reset verified');

    // 5. Test Lab 03 (DOM XSS in document.write)
    const resLab03 = await get('/lab03?search=testquery');
    if (resLab03.status !== 200) throw new Error('Lab 03 failed');
    if (!resLab03.body.includes('document.write(') || !resLab03.body.includes('trackSearch(query)')) {
      throw new Error('Lab 03 document.write tracker sink missing');
    }
    if (!resLab03.headers['set-cookie'] || !resLab03.headers['set-cookie'][0].includes('flag=')) {
      throw new Error('Lab 03 flag cookie missing');
    }
    const resTracker = await get('/images/tracker.gif');
    if (resTracker.status !== 200 || resTracker.headers['content-type'] !== 'image/gif') {
      throw new Error('Lab 03 tracker gif endpoint failed');
    }
    console.log('✓ Lab 03 DOM XSS (document.write) & tracker verified');

    // 6. Test Lab 04 (DOM XSS in innerHTML)
    const resLab04 = await get('/lab04?search=sample');
    if (resLab04.status !== 200) throw new Error('Lab 04 failed');
    if (!resLab04.body.includes('.innerHTML =') || !resLab04.body.includes('searchMessage')) {
      throw new Error('Lab 04 innerHTML sink missing');
    }
    if (!resLab04.headers['set-cookie'] || !resLab04.headers['set-cookie'][0].includes('flag=')) {
      throw new Error('Lab 04 flag cookie missing');
    }
    console.log('✓ Lab 04 DOM XSS (innerHTML) verified');

    // 7. Test Lab 05 (DOM XSS in jQuery anchor href)
    const resLab05 = await get('/lab05?returnPath=javascript:alert(1)');
    if (resLab05.status !== 200) throw new Error('Lab 05 failed');
    if (!resLab05.body.includes("$('#backLink').attr('href', returnPath)")) {
      throw new Error('Lab 05 jQuery attr href sink missing');
    }
    if (!resLab05.headers['set-cookie'] || !resLab05.headers['set-cookie'][0].includes('flag=')) {
      throw new Error('Lab 05 flag cookie missing');
    }
    const resJquery = await get('/js/vendor/jquery-1.8.3.min.js');
    if (resJquery.status !== 200 || !resJquery.body.includes('jQuery')) {
      throw new Error('Local jQuery 1.8.3 asset missing or inaccessible');
    }
    console.log('✓ Lab 05 DOM XSS (jQuery attr href) & local jQuery 1.8.3 verified');

    console.log('\n[SUCCESS] All verification tests passed successfully.');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('\n[FAIL] Test assertion failed:', err.message);
    server.close();
    process.exit(1);
  }
});

const http = require('http');
const fs = require('fs');

const port = 9333;
const base = process.argv[2];
const waitMs = (n) => new Promise((r) => setTimeout(r, n));

function getJson(p) {
  return new Promise((res, rej) => {
    http.get(`http://127.0.0.1:${port}${p}`, (r) => {
      let d = '';
      r.on('data', (c) => (d += c));
      r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } });
    }).on('error', rej);
  });
}

(async () => {
  let t = null;
  for (let i = 0; i < 40; i++) {
    try { t = await getJson('/json'); if (Array.isArray(t) && t.length) break; } catch (e) {}
    await waitMs(500);
  }
  if (!t || !t.length) { console.error('no CDP target'); process.exit(1); }
  const page = t.find((x) => x.type === 'page');
  const sock = new WebSocket(page.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  sock.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  };
  const send = (method, params) => new Promise((res) => {
    const mid = ++id;
    pending.set(mid, res);
    sock.send(JSON.stringify({ id: mid, method, params: params || {} }));
  });
  await new Promise((r, j) => { sock.onopen = r; sock.onerror = j; });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  const shot = async (out) => {
    const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    if (s.error) { console.error('capture error', s.error); return; }
    fs.writeFileSync(out, Buffer.from(s.result.data, 'base64'));
    console.error('saved', out);
  };
  const gesture = async (type, x, y, opts) =>
    send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1, ...(opts || {}) });
  const swipe = async (x1, y1, x2, y2) => {
    await gesture('mousePressed', x1, y1);
    for (let s = 1; s <= 8; s++) {
      await gesture('mouseMoved', x1 + ((x2 - x1) * s) / 8, y1 + ((y2 - y1) * s) / 8);
      await waitMs(30);
    }
    await gesture('mouseReleased', x2, y2);
  };
  const tap = async (x, y) => {
    await gesture('mousePressed', x, y);
    await waitMs(80);
    await gesture('mouseReleased', x, y);
  };

  await send('Page.navigate', { url: base });
  await waitMs(9000); // splash 3s + onboarding render

  // onboarding page 1 (swipe left)
  await swipe(330, 500, 55, 500);
  await waitMs(700);
  await shot(process.argv[3]); // onboard after first swipe ("Negosiasi Mudah")

  // page 3 (swipe left again) -> "Tingkatkan Bisnis" + button "Mulai Sekarang"
  await swipe(330, 500, 55, 500);
  await waitMs(700);

  // tap "Mulai Sekarang" (bottom of page content ~ y 690)
  await tap(195, 690);
  await waitMs(5000); // navigate to /login + animate
  await shot(process.argv[4]); // login page
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
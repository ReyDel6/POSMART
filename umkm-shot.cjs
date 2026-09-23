const http = require('http');
const fs = require('fs');

const port = 9333;
const url = process.argv[2];
const out = process.argv[3];
const waitMs = parseInt(process.argv[4] || '15000', 10);

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
    await new Promise((r) => setTimeout(r, 500));
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
  await send('Page.navigate', { url });
  await new Promise((r) => setTimeout(r, waitMs));
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  if (shot.error) { console.error('capture error', shot.error); process.exit(1); }
  fs.writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
  console.error('saved', out, shot.result.data.length, 'bytes(base64)');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
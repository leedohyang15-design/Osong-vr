// Show sync relay for the Osong star party VR.
// The presenter page (host) sends the show state; every phone (guest) in the same room gets it instantly.
// The server clock is the reference: everyone measures their offset to it with ping/pong.
//
// client -> server  {t:'hello', role:'host'|'guest', room, key?}   {t:'state', state}   {t:'ping', id}
// server -> client  {t:'welcome', role, key?, state}  {t:'denied'}  {t:'state', state}  {t:'count', n}  {t:'pong', id, s}
'use strict';
const http = require('http');
const { WebSocketServer } = require('ws');
const crypto = require('crypto');

const PORT = +process.env.PORT || 8080;
const rooms = new Map(); // room -> { key, state, hosts:Set, guests:Set, touched }

function room(id) {
  let r = rooms.get(id);
  if (!r) { r = { key: null, state: null, hosts: new Set(), guests: new Set(), touched: Date.now() }; rooms.set(id, r); }
  r.touched = Date.now();
  return r;
}
function send(ws, m) { if (ws.readyState === 1) ws.send(JSON.stringify(m)); }
function sendCount(r) { const m = { t: 'count', n: r.guests.size }; r.hosts.forEach(h => send(h, m)); }

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url.startsWith('/healthz')) { res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok ' + Date.now()); return; }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('osong-vr sync server. rooms: ' + rooms.size + '\n');
});
const wss = new WebSocketServer({ server, maxPayload: 16 * 1024 });

wss.on('connection', ws => {
  ws.alive = true;
  ws.on('pong', () => { ws.alive = true; });
  ws.on('message', buf => {
    let m; try { m = JSON.parse(buf); } catch (e) { return; }
    if (!m || typeof m !== 'object') return;
    if (m.t === 'ping') { send(ws, { t: 'pong', id: m.id, s: Date.now() }); return; }
    if (m.t === 'hello') {
      const id = String(m.room || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
      if (!id) return;
      const r = room(id);
      if (ws.room) { const old = rooms.get(ws.room); if (old) { old.hosts.delete(ws); old.guests.delete(ws); sendCount(old); } }
      ws.room = id;
      if (m.role === 'host') {
        if (r.key && m.key !== r.key) { send(ws, { t: 'denied' }); return; }
        if (!r.key) r.key = crypto.randomBytes(12).toString('hex');
        ws.role = 'host'; r.hosts.add(ws);
        send(ws, { t: 'welcome', role: 'host', key: r.key, state: r.state, s: Date.now() });
        sendCount(r);
      } else {
        ws.role = 'guest'; r.guests.add(ws);
        send(ws, { t: 'welcome', role: 'guest', state: r.state, s: Date.now() });
        sendCount(r);
      }
      return;
    }
    if (m.t === 'state' && ws.role === 'host' && ws.room) {
      const r = room(ws.room);
      if (!m.state || typeof m.state !== 'object') return;
      r.state = Object.assign({}, m.state, { rev: ((r.state && r.state.rev) || 0) + 1, at: Date.now() });
      const out = { t: 'state', state: r.state };
      r.guests.forEach(g => send(g, out));
      r.hosts.forEach(h => send(h, out));
    }
  });
  ws.on('close', () => {
    const r = ws.room && rooms.get(ws.room);
    if (!r) return;
    r.hosts.delete(ws); r.guests.delete(ws); r.touched = Date.now();
    sendCount(r);
  });
});

// drop dead sockets, forget rooms nobody has used for 12 hours
setInterval(() => {
  wss.clients.forEach(ws => { if (!ws.alive) return ws.terminate(); ws.alive = false; try { ws.ping(); } catch (e) {} });
  const old = Date.now() - 12 * 3600 * 1000;
  rooms.forEach((r, id) => { if (!r.hosts.size && !r.guests.size && r.touched < old) rooms.delete(id); });
}, 25000);

server.listen(PORT, () => console.log('sync server on :' + PORT));

// Show sync between the presenter laptop (host) and participants' phones (guests).
// Transport: PeerJS data channels (the host page is the hub; PeerJS's free cloud server only brokers the connection).
// ?transport=local swaps in a BroadcastChannel so several tabs on one machine can be tested without a network.
//
// The host owns one small state object and broadcasts it on every change and every 2 s:
//   { type:'state', rev, show, status:'idle'|'playing'|'paused', start, pos }
//   playing -> show position = (hostNow - start) / 1000    paused -> pos (seconds)
// Guests estimate the host clock from ping/pong round trips so everyone lands on the same frame.
var ShowSync = (function () {
  'use strict';
  var PREFIX = 'osongvr-2026-';
  var ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

  function makeRoom() {
    var s = '';
    for (var i = 0; i < 4; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return s;
  }
  function useLocal() { return /[?&]transport=local\b/.test(location.search) || typeof Peer === 'undefined'; }
  function position(state, hostNow) {
    if (!state || !state.show || state.status === 'idle') return null;
    return state.status === 'playing' ? (hostNow - state.start) / 1000 : state.pos;
  }

  // ---------- host ----------
  function host(room, on) {
    var state = { type: 'state', rev: 0, show: null, status: 'idle', start: 0, pos: 0 };
    var guests = {}, peer = null, bc = null, beat = null, closed = false;
    function count() {
      var n = 0, t = Date.now();
      for (var k in guests) if (guests[k].local ? t - guests[k].seen < 6000 : guests[k].conn.open) n++;
      return n;
    }
    function sendAll() {
      state.sent = Date.now();
      if (bc) bc.postMessage(state);
      for (var k in guests) { var g = guests[k]; if (g.conn && g.conn.open) { try { g.conn.send(state); } catch (e) {} } }
      on.count && on.count(count());
    }
    function onMsg(msg, reply, id) {
      if (!msg || typeof msg !== 'object') return;
      if (msg.type === 'ping') reply({ type: 'pong', id: msg.id, t: Date.now(), to: id });
      if (msg.type === 'hello') reply(state);
    }
    if (useLocal()) {
      bc = new BroadcastChannel(PREFIX + room);
      bc.onmessage = function (ev) {
        var m = ev.data;
        if (!m || !m.from) return;
        guests[m.from] = guests[m.from] || { local: true };
        guests[m.from].seen = Date.now();
        onMsg(m, function (r) { var c = {}; for (var k in r) c[k] = r[k]; c.to = m.from; bc.postMessage(c); }, m.from);
        on.count && on.count(count());
      };
      setTimeout(function () { on.status && on.status('ready'); }, 0);
    } else {
      var open = function () {
        peer = new Peer(PREFIX + room, { debug: 1 });
        peer.on('open', function () { on.status && on.status('ready'); });
        peer.on('connection', function (conn) {
          guests[conn.connectionId] = { conn: conn };
          conn.on('open', function () { try { conn.send(state); } catch (e) {} on.count && on.count(count()); });
          conn.on('data', function (m) { onMsg(m, function (r) { try { conn.send(r); } catch (e) {} }, conn.connectionId); });
          var drop = function () { delete guests[conn.connectionId]; on.count && on.count(count()); };
          conn.on('close', drop); conn.on('error', drop);
        });
        peer.on('disconnected', function () { if (!closed) { on.status && on.status('reconnecting'); try { peer.reconnect(); } catch (e) {} } });
        peer.on('error', function (e) {
          if (e.type === 'unavailable-id') { on.status && on.status('taken'); return; }
          if (e.type === 'peer-unavailable') return;
          on.status && on.status('error', e.type);
          if (['network', 'server-error', 'socket-error', 'socket-closed'].indexOf(e.type) >= 0 && !closed) {
            setTimeout(function () { if (!closed && peer.disconnected && !peer.destroyed) { try { peer.reconnect(); } catch (er) {} } }, 3000);
          }
        });
      };
      open();
    }
    beat = setInterval(sendAll, 2000);
    function set(patch) {
      for (var k in patch) state[k] = patch[k];
      state.rev++;
      sendAll();
      on.state && on.state(state);
    }
    return {
      state: function () { return state; },
      now: function () { return Date.now(); },
      position: function () { return position(state, Date.now()); },
      play: function (showId, from) {
        if (showId && showId !== state.show) from = from || 0;
        var pos = from != null ? from : (state.status === 'paused' ? state.pos : 0);
        set({ show: showId || state.show, status: 'playing', start: Date.now() - pos * 1000, pos: pos });
      },
      pause: function () {
        if (state.status !== 'playing') return;
        set({ status: 'paused', pos: (Date.now() - state.start) / 1000 });
      },
      seek: function (pos) {
        if (state.status === 'playing') set({ start: Date.now() - pos * 1000, pos: pos });
        else set({ status: 'paused', pos: pos });
      },
      stop: function () { set({ status: 'idle', pos: 0 }); },
      count: count,
      close: function () { closed = true; clearInterval(beat); if (peer) peer.destroy(); if (bc) bc.close(); }
    };
  }

  // ---------- guest ----------
  function guest(room, on) {
    var me = Math.random().toString(36).slice(2, 10);
    var offset = 0, samples = [], state = null, lastMsg = 0, status = 'connecting', closed = false;
    var peer = null, conn = null, bc = null, pingTimer = null, retryTimer = null, pings = 0, pending = {};
    function setStatus(s) { if (s !== status) { status = s; on.status && on.status(s); } }
    function hostNow() { return Date.now() + offset; }
    function handle(m) {
      if (!m || typeof m !== 'object') return;
      lastMsg = Date.now();
      if (m.type === 'pong') {
        var t0 = pending[m.id]; if (t0 == null) return;
        delete pending[m.id];
        var t1 = Date.now(), rtt = t1 - t0;
        samples.push({ rtt: rtt, off: m.t - (t0 + t1) / 2 });
        if (samples.length > 10) samples.shift();
        var best = samples.reduce(function (a, b) { return b.rtt < a.rtt ? b : a; });
        offset = best.off;
        return;
      }
      if (m.type === 'state') {
        if (!state || m.rev !== state.rev || m.status !== state.status) { state = m; on.state && on.state(m); }
        else state = m;
        setStatus('connected');
      }
    }
    function send(m) {
      if (bc) { m.from = me; bc.postMessage(m); return; }
      if (conn && conn.open) { try { conn.send(m); } catch (e) {} }
    }
    function ping() {
      var id = me + (pings++);
      pending[id] = Date.now();
      send({ type: 'ping', id: id });
      // fast at first to settle the clock, then every 10 s
      clearTimeout(pingTimer);
      pingTimer = setTimeout(ping, pings < 6 ? 700 : 10000);
    }
    function watchdog() {
      if (closed) return;
      if (status === 'connected' && Date.now() - lastMsg > 7000) { setStatus('reconnecting'); reconnect(); }
      setTimeout(watchdog, 2000);
    }
    function reconnect() {
      if (closed) return;
      clearTimeout(retryTimer);
      if (bc) { send({ type: 'hello' }); retryTimer = setTimeout(function () { if (status !== 'connected') reconnect(); }, 3000); return; }
      try { if (conn) conn.close(); } catch (e) {}
      conn = null;
      if (!peer || peer.destroyed) { startPeer(); return; }
      if (peer.disconnected) { try { peer.reconnect(); } catch (e) { startPeer(); return; } }
      connect();
    }
    function connect() {
      if (!peer || !peer.open) return;
      conn = peer.connect(PREFIX + room, { reliable: true });
      var c = conn;
      c.on('open', function () { if (c !== conn) return; pings = 0; ping(); });
      c.on('data', handle);
      c.on('close', function () { if (c !== conn || closed) return; setStatus('reconnecting'); retryTimer = setTimeout(reconnect, 3000); });
      c.on('error', function () { if (c !== conn || closed) return; setStatus('reconnecting'); retryTimer = setTimeout(reconnect, 3000); });
      clearTimeout(retryTimer);
      retryTimer = setTimeout(function () { if (status !== 'connected') reconnect(); }, 8000);
    }
    function startPeer() {
      try { if (peer) peer.destroy(); } catch (e) {}
      peer = new Peer({ debug: 1 });
      peer.on('open', connect);
      peer.on('disconnected', function () { if (!closed) setTimeout(function () { try { peer.reconnect(); } catch (e) {} }, 2000); });
      peer.on('error', function (e) {
        if (closed) return;
        if (e.type === 'peer-unavailable') setStatus('waiting');
        else setStatus('reconnecting');
        clearTimeout(retryTimer);
        retryTimer = setTimeout(reconnect, 3000);
      });
    }
    if (useLocal()) {
      bc = new BroadcastChannel(PREFIX + room);
      bc.onmessage = function (ev) { var m = ev.data; if (m && (!m.to || m.to === me) && !m.from) handle(m); };
      send({ type: 'hello' }); pings = 0; ping();
      setInterval(function () { send({ type: 'hello' }); }, 3000);
      retryTimer = setTimeout(function () { if (status !== 'connected') { setStatus('waiting'); reconnect(); } }, 2000);
    } else startPeer();
    setTimeout(watchdog, 2000);
    return {
      status: function () { return status; },
      state: function () { return state; },
      hostNow: hostNow,
      position: function () { return position(state, hostNow()); },
      offset: function () { return offset; },
      close: function () { closed = true; clearTimeout(pingTimer); clearTimeout(retryTimer); if (peer) peer.destroy(); if (bc) bc.close(); }
    };
  }

  return { host: host, guest: guest, makeRoom: makeRoom, position: position, usingLocal: useLocal };
})();

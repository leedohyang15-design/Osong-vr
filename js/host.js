// Presenter console: owns the show clock, broadcasts it to every phone, shows the presenter script.
(function () {
  'use strict';
  var C = SkyCore;
  var $ = function (id) { return document.getElementById(id); };
  var QS = new URLSearchParams(location.search);
  var canvas = $('sky'), stage = canvas.parentNode;
  var eng = SkyEngine(canvas);

  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function fmt(s) { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
  function clockText(min) {
    var t = 18 * 60 + Math.round(min), h = Math.floor(t / 60) % 24, m = t % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function camFrom(yaw, pitch) {
    var az = yaw * C.D2R, al = pitch * C.D2R;
    var f = [Math.sin(az) * Math.cos(al), Math.cos(az) * Math.cos(al), Math.sin(al)], r = [Math.cos(az), -Math.sin(az), 0];
    return { f: f, r: r, u: cross(r, f) };
  }

  // ---------- room ----------
  var room = (QS.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!room) { try { room = localStorage.getItem('osongvr-room') || ''; } catch (e) {} }
  if (!room) room = ShowSync.makeRoom();
  try { localStorage.setItem('osongvr-room', room); } catch (e) {}

  function joinUrl() {
    var u = new URL('./', location.href);
    u.searchParams.set('room', room);
    if (ShowSync.usingLocal() && QS.has('transport')) u.searchParams.set('transport', 'local');
    return u.toString();
  }
  function qrSvg(text) {
    var q = qrcode(0, 'M'); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  }
  function renderJoin() {
    var url = joinUrl();
    $('roomCode').textContent = room; $('qrBigRoom').textContent = room;
    $('joinUrl').textContent = url; $('qrBigUrl').textContent = url;
    $('qr').innerHTML = qrSvg(url); $('qrBigCode').innerHTML = qrSvg(url);
  }
  renderJoin();

  var PEER_TEXT = {
    connecting: '연결 서버에 접속하는 중', ready: '준비됐어요. 휴대폰이 접속할 수 있어요.',
    reconnecting: '연결 서버에 다시 접속하는 중', taken: '이 방 코드를 다른 창이 쓰고 있어요. 그 창을 닫거나 새 방 코드를 만드세요.',
    error: '연결 서버에 문제가 있어요. 인터넷 연결을 확인하세요.'
  };
  function setPeer(s, detail) {
    $('peerState').dataset.state = s;
    $('peerText').textContent = (PEER_TEXT[s] || s) + (s === 'error' && detail ? ' (' + detail + ')' : '');
  }
  var hub = null;
  function openHub() {
    if (hub) hub.close();
    setPeer('connecting');
    hub = ShowSync.host(room, {
      status: setPeer,
      count: function (n) { $('count').textContent = n; }
    });
  }
  openHub();
  $('newRoom').addEventListener('click', function () {
    if (hub && hub.state().status === 'playing' && !confirm('쇼가 재생 중이에요. 방 코드를 바꾸면 접속한 사람들이 모두 끊겨요. 바꿀까요?')) return;
    room = ShowSync.makeRoom();
    try { localStorage.setItem('osongvr-room', room); } catch (e) {}
    history.replaceState(null, '', location.pathname + (QS.has('transport') ? '?transport=local' : ''));
    renderJoin(); openHub();
  });

  // ---------- show selection ----------
  SHOWS.forEach(function (s) {
    var o = document.createElement('option'); o.value = s.id; o.textContent = s.title + ' (' + fmt(s.duration) + ')';
    $('showSel').appendChild(o);
  });
  function selected() { return ShowTimeline.byId($('showSel').value); }
  function buildSteps() {
    var show = selected(), list = $('stepList'), scrub = $('scrub');
    list.innerHTML = '';
    scrub.querySelectorAll('.tick').forEach(function (t) { t.remove(); });
    show.steps.forEach(function (s, i) {
      var li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = '<span class="t"></span><span class="n"></span>';
      b.querySelector('.t').textContent = fmt(s.t);
      b.querySelector('.n').textContent = s.title;
      b.addEventListener('click', function () { seekTo(s.t + 0.01); });
      li.appendChild(b); list.appendChild(li);
      var tk = document.createElement('span'); tk.className = 'tick'; tk.style.left = (100 * s.t / show.duration) + '%';
      scrub.appendChild(tk);
    });
    $('dur').textContent = fmt(show.duration);
  }
  $('showSel').addEventListener('change', function () {
    var s = hub.state();
    if (s.status !== 'idle') hub.stop();
    buildSteps();
  });
  buildSteps();

  // ---------- transport ----------
  function pos() { var p = hub.position(); return p == null ? 0 : p; }
  function seekTo(t) {
    var show = selected();
    t = clamp(t, 0, show.duration - 0.05);
    var s = hub.state();
    if (s.status === 'idle' || s.show !== show.id) hub.play(show.id, t);
    else hub.seek(t);
  }
  function togglePlay() {
    var s = hub.state(), show = selected();
    if (s.status === 'playing') hub.pause();
    else if (s.status === 'paused' && s.show === show.id) hub.play(show.id, s.pos);
    else hub.play(show.id, 0);
  }
  $('playBtn').addEventListener('click', function () {
    var s = hub.state(), show = selected();
    if (s.status === 'paused' && s.show === show.id) hub.play(show.id, s.pos);
    else if (s.status !== 'playing' || s.show !== show.id) hub.play(show.id, 0);
  });
  $('pauseBtn').addEventListener('click', function () { hub.pause(); });
  $('stopBtn').addEventListener('click', function () { hub.stop(); });
  $('scrub').addEventListener('click', function (e) {
    var r = this.getBoundingClientRect();
    seekTo(selected().duration * clamp((e.clientX - r.left) / r.width, 0, 1));
  });
  function stepJump(d) {
    var show = selected(), s = hub.state();
    if (s.status === 'idle') { if (d > 0) hub.play(show.id, 0); return; }
    var i = ShowTimeline.stepAt(show, pos());
    var t = pos() - show.steps[i].t;
    var j = d < 0 && t > 3 ? i : clamp(i + d, 0, show.steps.length - 1); // first ← goes back to the start of this scene
    seekTo(show.steps[j].t + 0.01);
  }
  document.addEventListener('keydown', function (e) {
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.key === 'ArrowRight') stepJump(1);
    else if (e.key === 'ArrowLeft') stepJump(-1);
    else if (e.key === 'q' || e.key === 'Q') toggleQr();
    else if (e.key === 'Escape') $('qrBig').hidden = true;
  });
  function toggleQr() { $('qrBig').hidden = !$('qrBig').hidden; }
  $('qr').addEventListener('click', toggleQr);
  $('qrBigBtn').addEventListener('click', toggleQr);
  $('qrBig').addEventListener('click', toggleQr);

  // ---------- preview ----------
  var W = 0, H = 0;
  function resize() { var r = stage.getBoundingClientRect(); W = r.width; H = r.height; eng.resize(W, H, window.devicePixelRatio || 1); }
  window.addEventListener('resize', resize); resize();
  try { if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(function () {}); } catch (e) {}

  var cam = camFrom(160, 40), idleYaw = 160, lastIdx = -2, lastCap = '';
  var SHOW_ALL = { lines: true, names: true, stars: true, mw: true, dirs: true };
  function loop(now) {
    var s = hub.state(), show = s.show ? ShowTimeline.byId(s.show) : null, t = pos();
    var active = show && s.status !== 'idle';
    if (active && t > show.duration) { hub.stop(); active = false; }
    var ev = active ? ShowTimeline.evaluate(eng, show, t) : null;
    var o = { minutes: 90, lim: 4.6, show: SHOW_ALL, mode: 'flat', fov: 80, cyFrac: 0.5, reticle: false };
    if (ev) {
      var aa = C.enuToAltAz(ev.dir);
      cam = camFrom(aa.az, clamp(aa.alt, -4, 86));
      o.minutes = ev.minutes; o.fov = ev.fov; o.highlight = ev.highlight; o.hlAlpha = ev.hlAlpha; o.figures = ev.figures; o.pointer = ev.pointer;
      idleYaw = aa.az;
    } else {
      idleYaw = (idleYaw + 0.02) % 360;
      cam = camFrom(idleYaw, 40);
    }
    o.cam = cam;
    eng.render(o);
    $('stageClock').textContent = clockText(o.minutes);

    // caption overlay
    var cap = $('caption');
    if (ev && ev.caption) {
      cap.hidden = false; cap.style.opacity = ev.caption.alpha.toFixed(3);
      var key = ev.caption.title + ev.caption.sub;
      if (key !== lastCap) { lastCap = key; $('capTitle').textContent = ev.caption.title; $('capSub').textContent = ev.caption.sub; }
    } else cap.hidden = true;

    // transport + script
    var sel = selected(), mine = active && s.show === sel.id;
    $('pos').textContent = fmt(mine ? t : 0);
    $('scrubFill').style.width = (mine ? 100 * clamp(t / sel.duration, 0, 1) : 0) + '%';
    $('playBtn').textContent = s.status === 'paused' ? '이어서 재생' : '재생';
    $('playBtn').disabled = s.status === 'playing' && mine;
    $('pauseBtn').disabled = s.status !== 'playing';
    $('stopBtn').disabled = s.status === 'idle';
    var idx = mine ? ev.index : -1;
    if (idx !== lastIdx) {
      lastIdx = idx;
      var items = $('stepList').children;
      for (var k = 0; k < items.length; k++) items[k].className = k === idx ? 'on' : '';
      if (idx >= 0) {
        var st = sel.steps[idx], nx = sel.steps[idx + 1];
        $('stepNo').textContent = (idx + 1) + ' / ' + sel.steps.length;
        $('nowTitle').textContent = st.title; $('nowNote').textContent = st.note || '';
        $('nextWrap').hidden = !nx;
        if (nx) $('nextNote').textContent = nx.title + ' — ' + (nx.note || '');
      } else {
        $('stepNo').textContent = '';
        $('nowTitle').textContent = '쇼를 고르고 재생을 누르세요';
        $('nowNote').textContent = '재생하면 접속한 모든 휴대폰이 같은 장면으로 넘어가요. 늦게 들어온 사람도 바로 지금 장면에 맞춰져요.';
        $('nextWrap').hidden = true;
      }
    }
    if (idx >= 0 && sel.steps[idx + 1]) $('nextIn').textContent = fmt(sel.steps[idx + 1].t - t) + ' 뒤' + (s.status === 'paused' ? ' (일시정지)' : '');
    requestAnimationFrame(loop);
  }
  if (document.fonts && document.fonts.load) ['16px "Nanum Myeongjo"', '16px "IBM Plex Sans KR"', '16px "IBM Plex Mono"'].forEach(function (f) { document.fonts.load(f); });
  requestAnimationFrame(loop);
  window.__host = { hub: function () { return hub; }, room: function () { return room; } };
})();

// Sync server for phones and the presenter page. This copy uses our Render server (server/server.mjs runs worker.js);
// the Cloudflare Worker would be 'wss://osong-vr-sync.lrwe36.workers.dev'. Pages can override it with ?server=ws://localhost:8787
var SYNC_SERVER = 'wss://osong-vr-sync.onrender.com';

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tab-btn').forEach(b=>{b.classList.remove('tab-active'); b.classList.add('bg-gray-100')});
    btn.classList.add('tab-active'); btn.classList.remove('bg-gray-100');
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-panel').forEach(p=> p.classList.toggle('hidden', p.dataset.panel!==tab));
  });
});

// Helpers - let so fallback to http://localhost:3000 works for standalone client on 8080
let base = location.origin;
function out(id, data){ document.getElementById(id).textContent = typeof data==='string'? data : JSON.stringify(data,null,2); }
async function fetchJson(url, opts={}){
  const res = await fetch(url, opts);
  const text = await res.text();
  let json; try{ json = JSON.parse(text);}catch{ json = text;}
  return { status: res.status, headers: Object.fromEntries(res.headers.entries()), body: json, ok: res.ok };
}

// Server status + unified BaseUrl with fallback to http://localhost:3000 for standalone client
(async()=>{
  let resolvedBase = base;
  for(const cand of [location.origin, 'http://localhost:3000']){
    try{
      const r = await fetchJson(cand+'/api/config');
      if(r.ok && r.body.baseUrl){ resolvedBase = r.body.baseUrl; break; }
    }catch{}
  }
  base = resolvedBase;
  try{
    const el = document.getElementById('unifiedBaseUrl');
    if(el) el.textContent = base;
    document.querySelectorAll('#baseUrl, #unifiedBaseUrl').forEach(e=> e.textContent=base);
    const wsEl = document.querySelectorAll('.ws-base');
    wsEl.forEach(e=> e.textContent=base.replace('http','ws'));
  }catch{}
  try{
    const r = await fetchJson(base+'/health');
    document.getElementById('serverStatus').innerHTML = `<span class="w-2 h-2 bg-green-500 rounded-full realtime-dot"></span> online • ${r.body.baseUrl||base} • ${r.body.uptime? r.body.uptime.toFixed(0)+'s':''}`;
  }catch{ document.getElementById('serverStatus').innerHTML = `<span class="w-2 h-2 bg-red-500 rounded-full"></span> offline`; }
})();

// PUBLIC
async function callPublic(which){
  const r = await fetchJson(base+`/api/public/${which}`);
  out('publicOut', r);
}
async function callPublicEcho(){
  const val = document.getElementById('publicEcho').value;
  let body = val; try{ body = JSON.parse(val);}catch{}
  const r = await fetchJson(base+'/api/public/echo', {method:'POST', headers:{'Content-Type':'application/json'}, body: typeof body==='string'? body: JSON.stringify(body)});
  out('publicOut', r);
}

// BASIC
async function callBasic(which){
  const u = document.getElementById('basicUser').value;
  const p = document.getElementById('basicPass').value;
  const headers = { 'Authorization': 'Basic '+ btoa(u+':'+p) };
  const url = which==='credentials' ? base+'/api/basic/credentials' : base+`/api/basic/${which}`;
  const r = await fetchJson(url, {headers});
  out('basicOut', r);
  // For realtime WS maybe store
  window._basicCred = btoa(u+':'+p);
}

// DIGEST - JS computed
async function callDigest(which){
  if(which==='credentials'){
    const r = await fetchJson(base+'/api/digest/credentials');
    out('digestOut', r); return;
  }
  const user = document.getElementById('digestUser').value;
  const pass = document.getElementById('digestPass').value;
  // First request to get nonce
  const first = await fetch(base+'/api/digest/data');
  const www = first.headers.get('WWW-Authenticate');
  if(!www){ out('digestOut', {error:'No WWW-Authenticate', status:first.status}); return; }
  // Parse www
  const params = {}; www.replace(/(\w+)="([^"]+)"/g, (_,k,v)=> params[k]=v);
  const realm = params.realm, nonce=params.nonce, opaque=params.opaque, qop=params.qop||'auth';
  const uri = '/api/digest/data';
  const method='GET';
  const nc='00000001';
  const cnonce = Math.random().toString(36).slice(2,10);
  // MD5 via subtle? Use simple JS md5
  const md5 = await md5Async;
  const HA1 = await md5(`${user}:${realm}:${pass}`);
  const HA2 = await md5(`${method}:${uri}`);
  const response = await md5(`${HA1}:${nonce}:${nc}:${cnonce}:${qop}:${HA2}`);
  const header = `Digest username="${user}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}", opaque="${opaque}"`;
  const r2 = await fetchJson(base+'/api/digest/data', { headers:{ Authorization: header }});
  out('digestOut', { step:'digest computed', params, HA1, HA2, response, result:r2 });
}

// Minimal MD5 in JS (from https://github.com/blueimp/JavaScript-MD5 minimal)
function md5cycle(x, k){/* trimmed for brevity use Web Crypto if available */}
async function md5Async(str){
  // Use Web Crypto if available via subtle? MD5 not in subtle, so use custom
  return md5js(str);
}
function md5js(string){
  function cmn(q,a,b,x,s,t){a=add32(add32(a,q),add32(x,t));return add32((a<<s)|(a>>>32-s),b)}
  function ff(a,b,c,d,x,s,t){return cmn((b&c)|(~b&d),a,b,x,s,t)}
  function gg(a,b,c,d,x,s,t){return cmn((b&d)|(c&~d),a,b,x,s,t)}
  function hh(a,b,c,d,x,s,t){return cmn(b^c^d,a,b,x,s,t)}
  function ii(a,b,c,d,x,s,t){return cmn(c^(b|~d),a,b,x,s,t)}
  function md5blk(s){var md5blks=[],i;for(i=0;i<64;i+=4){md5blks[i>>2]=s.charCodeAt(i)+(s.charCodeAt(i+1)<<8)+(s.charCodeAt(i+2)<<16)+(s.charCodeAt(i+3)<<24)}return md5blks}
  function rhex(n){var s='',j;for(j=0;j<4;j++)s+=('0'+((n>>j*8)&0xFF).toString(16)).slice(-2);return s}
  function add32(a,b){return (a+b)&0xFFFFFFFF}
  function md5(s){var n=s.length,a=1732584193,b=-271733879,c=-1732584194,d=271733878,i;for(i=64;i<=s.length;i+=64){var blk=md5blk(s.substring(i-64,i));var olda=a,oldb=b,oldc=c,oldd=d;a=ff(a,b,c,d,blk[0],7,-680876936);d=ff(d,a,b,c,blk[1],12,-389564586);c=ff(c,d,a,b,blk[2],17,606105819);b=ff(b,c,d,a,blk[3],22,-1044525330);a=ff(a,b,c,d,blk[4],7,-176418897);d=ff(d,a,b,c,blk[5],12,1200080426);c=ff(c,d,a,b,blk[6],17,-1473231341);b=ff(b,c,d,a,blk[7],22,-45705983);a=ff(a,b,c,d,blk[8],7,1770035416);d=ff(d,a,b,c,blk[9],12,-1958414417);c=ff(c,d,a,b,blk[10],17,-42063);b=ff(b,c,d,a,blk[11],22,-1990404162);a=ff(a,b,c,d,blk[12],7,1804603682);d=ff(d,a,b,c,blk[13],12,-40341101);c=ff(c,d,a,b,blk[14],17,-1502002290);b=ff(b,c,d,a,blk[15],22,1236535329);a=gg(a,b,c,d,blk[1],5,-165796510);d=gg(d,a,b,c,blk[6],9,-1069501632);c=gg(c,d,a,b,blk[11],14,643717713);b=gg(b,c,d,a,blk[0],20,-373897302);a=gg(a,b,c,d,blk[5],5,-701558691);d=gg(d,a,b,c,blk[10],9,38016083);c=gg(c,d,a,b,blk[15],14,-660478335);b=gg(b,c,d,a,blk[4],20,-405537848);a=gg(a,b,c,d,blk[9],5,568446438);d=gg(d,a,b,c,blk[14],9,-1019803690);c=gg(c,d,a,b,blk[3],14,-187363961);b=gg(b,c,d,a,blk[8],20,1163531501);a=gg(a,b,c,d,blk[13],5,-1444681467);d=gg(d,a,b,c,blk[2],9,-51403784);c=gg(c,d,a,b,blk[7],14,1735328473);b=gg(b,c,d,a,blk[12],20,-1926607734);a=hh(a,b,c,d,blk[5],4,-378558);d=hh(d,a,b,c,blk[8],11,-2022574463);c=hh(c,d,a,b,blk[11],16,1839030562);b=hh(b,c,d,a,blk[14],23,-35309556);a=hh(a,b,c,d,blk[1],4,-1530992060);d=hh(d,a,b,c,blk[4],11,1272893353);c=hh(c,d,a,b,blk[7],16,-155497632);b=hh(b,c,d,a,blk[10],23,-1094730640);a=hh(a,b,c,d,blk[13],4,681279174);d=hh(d,a,b,c,blk[0],11,-358537222);c=hh(c,d,a,b,blk[3],16,-722521979);b=hh(b,c,d,a,blk[6],23,76029189);a=hh(a,b,c,d,blk[9],4,-640364487);d=hh(d,a,b,c,blk[12],11,-421815835);c=hh(c,d,a,b,blk[15],16,530742520);b=hh(b,c,d,a,blk[2],23,-995338651);a=ii(a,b,c,d,blk[0],6,-198630844);d=ii(d,a,b,c,blk[7],10,1126891415);c=ii(c,d,a,b,blk[14],15,-1416354905);b=ii(b,c,d,a,blk[5],21,-57434055);a=ii(a,b,c,d,blk[12],6,1700485571);d=ii(d,a,b,c,blk[3],10,-1894986606);c=ii(c,d,a,b,blk[10],15,-1051523);b=ii(b,c,d,a,blk[1],21,-2054922799);a=ii(a,b,c,d,blk[8],6,1873313359);d=ii(d,a,b,c,blk[15],10,-30611744);c=ii(c,d,a,b,blk[6],15,-1560198380);b=ii(b,c,d,a,blk[13],21,1309151649);a=ii(a,b,c,d,blk[4],6,-145523070);d=ii(d,a,b,c,blk[11],10,-1120210379);c=ii(c,d,a,b,blk[2],15,718787259);b=ii(b,c,d,a,blk[9],21,-343485551);a=add32(a,olda);b=add32(b,oldb);c=add32(c,oldc);d=add32(d,oldd)}return rhex(a)+rhex(b)+rhex(c)+rhex(d)}
  return md5(string);
}

// GENERIC OAUTH
async function callGenericOAuth(){ const r=await fetchJson(base+'/api/oauth/info'); out('oauthOut', r); }

// OAUTH1
async function callOAuth1(which){
  if(which==='credentials'){ const r=await fetchJson(base+'/api/oauth1/credentials'); out('oauth1Out', r); return; }
}
async function callOAuth1Signed(){
  // Use JS oauth signing (simplified, uses same HMAC method as server)
  // For demo we call server helper that returns signature? Instead do manual
  const url = base+'/api/oauth1/data';
  const consumerKey='oauth1_consumer_key', consumerSecret='oauth1_consumer_secret_123', token='oauth1_token_abc', tokenSecret='oauth1_token_secret_xyz';
  const nonce = Math.random().toString(36).slice(2,10);
  const timestamp = Math.floor(Date.now()/1000).toString();
  const params = { oauth_consumer_key: consumerKey, oauth_token: token, oauth_signature_method:'HMAC-SHA1', oauth_timestamp: timestamp, oauth_nonce: nonce, oauth_version:'1.0' };
  // Build signature base
  const method='GET';
  const baseUrl = url;
  const all = Object.keys(params).sort().map(k=> `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  const baseStr = `${method}&${encodeURIComponent(baseUrl)}&${encodeURIComponent(all)}`;
  const signingKey = encodeURIComponent(consumerSecret)+'&'+encodeURIComponent(tokenSecret);
  const sig = await hmacSHA1(signingKey, baseStr);
  const header = `OAuth oauth_consumer_key="${consumerKey}", oauth_token="${token}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${timestamp}", oauth_nonce="${nonce}", oauth_version="1.0", oauth_signature="${encodeURIComponent(sig)}"`;
  const r = await fetchJson(url, { headers:{ Authorization: header }});
  out('oauth1Out', { signatureBase: baseStr, signingKey, signature: sig, header, result: r });
}
async function hmacSHA1(key, data){
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey('raw', enc.encode(key), {name:'HMAC', hash:'SHA-1'}, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

// OAUTH1a
async function oauth1aStep1(){
  const r = await fetchJson(base+'/api/oauth1a/request_token', { method:'GET' });
  out('oauth1aOut', r);
  if(r.body.oauth_token){ document.getElementById('o1aToken').value = r.body.oauth_token; }
}
async function oauth1aStep2(){
  const token = document.getElementById('o1aToken').value;
  if(!token){ out('oauth1aOut', {error:'Need token from step1'}); return; }
  const r = await fetchJson(base+`/api/oauth1a/authorize?oauth_token=${token}`);
  out('oauth1aOut', r);
  if(r.body.oauth_verifier) document.getElementById('o1aVerifier').value = r.body.oauth_verifier;
}
async function oauth1aStep3(){
  const token = document.getElementById('o1aToken').value;
  const verifier = document.getElementById('o1aVerifier').value;
  const r = await fetchJson(base+'/api/oauth1a/access_token?oauth_token='+encodeURIComponent(token)+'&oauth_verifier='+encodeURIComponent(verifier));
  out('oauth1aOut', r);
  if(r.body.oauth_token){ document.getElementById('o1aAccess').value = r.body.oauth_token; document.getElementById('o1aSecret').value = r.body.oauth_token_secret; }
}
async function callOAuth1aData(){
  const token = document.getElementById('o1aAccess').value;
  if(!token){ out('oauth1aOut', {error:'Need access token'}); return; }
  const r = await fetchJson(base+'/api/oauth1a/data', { headers:{ Authorization: `OAuth oauth_token="${token}"` }});
  out('oauth1aOut', r);
}

// OAUTH2
async function oAuth2Password(){
  const u=document.getElementById('o2User').value, p=document.getElementById('o2Pass').value;
  const r = await fetchJson(base+'/api/oauth2/token', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ grant_type:'password', username:u, password:p, client_id:'client_app_123', client_secret:'client_secret_abc_123'})});
  out('oauth2Out', r);
  if(r.body.access_token){ document.getElementById('o2Token').value = r.body.access_token; window._o2_refresh = r.body.refresh_token; }
}
async function oAuth2ClientCreds(){
  const r = await fetchJson(base+'/api/oauth2/token', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ grant_type:'client_credentials', client_id:'client_app_123', client_secret:'client_secret_abc_123'})});
  out('oauth2Out', r);
  if(r.body.access_token) document.getElementById('o2Token').value = r.body.access_token;
}
async function oAuth2AuthCode(){
  // 1 get code then exchange
  const r1 = await fetchJson(base+'/api/oauth2/authorize?response_type=code&client_id=client_app_123&redirect_uri=http://localhost:3000/callback&user=john');
  out('oauth2Out', {step:'authorize', r1});
  const code = r1.body.code || (r1.body.redirect_uri && new URL(r1.body.redirect_uri).searchParams.get('code'));
  if(!code){ out('oauth2Out', {error:'No code', r1}); return; }
  const r2 = await fetchJson(base+'/api/oauth2/token', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ grant_type:'authorization_code', code, client_id:'client_app_123', client_secret:'client_secret_abc_123', redirect_uri:'http://localhost:3000/callback'})});
  out('oauth2Out', {step:'token', code, r2});
  if(r2.body.access_token){ document.getElementById('o2Token').value = r2.body.access_token; window._o2_refresh = r2.body.refresh_token; }
}
async function oAuth2Refresh(){
  const rt = window._o2_refresh || prompt('refresh token');
  if(!rt){ out('oauth2Out', {error:'No refresh token'}); return; }
  const r = await fetchJson(base+'/api/oauth2/token', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ grant_type:'refresh_token', refresh_token: rt, client_id:'client_app_123', client_secret:'client_secret_abc_123'})});
  out('oauth2Out', r);
  if(r.body.access_token) document.getElementById('o2Token').value = r.body.access_token;
}
async function oAuth2Introspect(){
  const t=document.getElementById('o2Token').value;
  const r=await fetchJson(base+'/api/oauth2/introspect', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({token:t})});
  out('oauth2Out', r);
}
async function callOAuth2(which){
  const token=document.getElementById('o2Token').value;
  if(!token){ out('oauth2Out', {error:'Need Bearer token first (run Password grant)'}); return; }
  const r=await fetchJson(base+`/api/oauth2/${which}`, { headers:{ Authorization: 'Bearer '+token }});
  out('oauth2Out', r);
}

// REALTIME
let ws=null, es=null, socket=null;
let livePoll=null;
function wsConnect(auth){
  if(ws) ws.close();
  let url = `ws://${location.host}/ws?auth=${auth}`;
  if(auth==='oauth2'){
    const token=document.getElementById('o2Token').value;
    if(token) url += `&token=${encodeURIComponent(token)}`;
  }
  ws = new WebSocket(url);
  out('realtimeOut', { connecting: url });
  ws.onopen = ()=> ws.send(JSON.stringify({action:'subscribe', channel:'stocks'}));
  ws.onmessage = e=> {
    const data = JSON.parse(e.data);
    out('realtimeOut', data);
    if(data.payload) updatePreview(data.payload);
  };
  ws.onerror = e=> out('realtimeOut', {error:'ws error', e});
}
function wsSubscribe(){
  const ch = document.getElementById('wsChannel').value;
  if(ws && ws.readyState===1) ws.send(JSON.stringify({action:'subscribe', channel: ch}));
}
function sseConnect(kind){
  if(es) es.close();
  let url = base+'/api/realtime/sse';
  let headers={};
  if(kind==='oauth2'){
    const token=document.getElementById('o2Token').value;
    // SSE can't set headers, use query? fallback fetch with EventSource? Use fetch stream alternative
    // We have endpoint /api/realtime/sse/oauth2 that expects Bearer header, but EventSource can't set headers.
    // So for demo we use token via query via ws, but SSE Bearer will need cookie alternative.
    // We'll try to use fetch + Bearer via manual streaming
    out('realtimeOut', {info:'SSE Bearer via fetch stream (EventSource cannot send Bearer header). Using authenticated fetch.'});
    // Use authenticated fetch polling
    const token2=document.getElementById('o2Token').value;
    if(!token2){ out('realtimeOut', {error:'Need OAuth2 token for SSE Bearer'}); return; }
    // Fallback to polling with auth header
    setInterval(async()=>{
      const r=await fetchJson(base+'/api/oauth2/realtime', {headers:{Authorization:'Bearer '+token2}});
      out('realtimeOut', r.body);
      if(r.body.realtime) updatePreview(r.body.realtime);
    },2000);
    return;
  }
  if(kind==='public'){
    es = new EventSource(url);
    es.addEventListener('realtime', e=>{ const d=JSON.parse(e.data); out('realtimeOut', d); updatePreview(d); });
    es.addEventListener('connected', e=> out('realtimeOut', JSON.parse(e.data)));
    es.onerror = e=> out('realtimeOut', {sseError:e});
  }
}
function socketIOConnect(){
  if(socket) socket.disconnect();
  const token=document.getElementById('o2Token').value;
  socket = io(base, { auth: token? {token}: {} });
  socket.on('connected', d=>{ out('realtimeOut', d); if(d.payload) updatePreview(d.payload); });
  socket.on('realtime', d=>{ out('realtimeOut', d); updatePreview(d); });
  socket.on('connect_error', e=> out('realtimeOut', {socketError: e.message}));
}
function stopAllRealtime(){
  if(ws) ws.close(); if(es) es.close(); if(socket) socket.disconnect();
  out('realtimeOut', {stopped:true});
}

// Live preview polling
async function pollPreview(){
  try{
    const r=await fetchJson(base+'/api/public/data');
    const data = r.body.realtime || r.body;
    document.getElementById('livePreview').textContent = JSON.stringify(data, null, 2);
    updatePreview(data);
  }catch(e){ document.getElementById('livePreview').textContent = 'error '+e; }
}
function updatePreview(data){
  if(!data) return;
  try{
    if(data.crypto) document.getElementById('previewBTC').textContent = data.crypto.find(c=>c.symbol==='BTC')?.price || '-';
    if(data.stocks) document.getElementById('previewAAPL').textContent = data.stocks.find(s=>s.symbol==='AAPL')?.price || '-';
    if(data.sensors) document.getElementById('previewCPU').textContent = data.sensors.cpu+'%';
    if(data.metrics) document.getElementById('previewRPS').textContent = data.metrics.requestsPerSec;
  }catch{}
}
pollPreview(); setInterval(pollPreview, 2000);

async function runAllTests(){
  await callPublic('info');
  setTimeout(()=> callPublic('data'),500);
  setTimeout(()=> callBasic('data'),1000);
}

window.callPublic=callPublic; window.callPublicEcho=callPublicEcho; window.callBasic=callBasic; window.callDigest=callDigest; window.callGenericOAuth=callGenericOAuth; window.callOAuth1=callOAuth1; window.callOAuth1Signed=callOAuth1Signed; window.oauth1aStep1=oauth1aStep1; window.oauth1aStep2=oauth1aStep2; window.oauth1aStep3=oauth1aStep3; window.callOAuth1aData=callOAuth1aData; window.oAuth2Password=oAuth2Password; window.oAuth2ClientCreds=oAuth2ClientCreds; window.oAuth2AuthCode=oAuth2AuthCode; window.oAuth2Refresh=oAuth2Refresh; window.oAuth2Introspect=oAuth2Introspect; window.callOAuth2=callOAuth2; window.wsConnect=wsConnect; window.sseConnect=sseConnect; window.socketIOConnect=socketIOConnect; window.stopAllRealtime=stopAllRealtime; window.runAllTests=runAllTests; window.wsSubscribe=wsSubscribe;

// C2M Testing - Dynamic BaseUrl
function c2mGetBase(){ const el=document.getElementById('c2mBaseUrl'); let v=el?el.value.trim():''; if(!v) v=base; return v.replace(/\/$/,''); }
function c2mSetBase(url){ const el=document.getElementById('c2mBaseUrl'); if(el) el.value=url; localStorage.setItem('c2mBaseUrl',url); const p=document.getElementById('c2mHostPreview'); if(p) p.textContent=url; }
function c2mSaveBaseUrl(){ const v=c2mGetBase(); localStorage.setItem('c2mBaseUrl',v); const p=document.getElementById('c2mHostPreview'); if(p) p.textContent=v; out('c2mOut',{saved:v}); }
function c2mUseCurrent(){ c2mSetBase(base); }
function c2mPasteTunnel(){ const v=prompt('Paste public tunnel URL (https://xxxx.lhr.life or https://xxxx.trycloudflare.com)'); if(v) c2mSetBase(v.trim().replace(/\/$/,'')); }
(function(){ const saved=localStorage.getItem('c2mBaseUrl'); if(saved){ const el=document.getElementById('c2mBaseUrl'); if(el) el.value=saved; const p=document.getElementById('c2mHostPreview'); if(p) p.textContent=saved; } const el=document.getElementById('c2mBaseUrl'); if(el) el.addEventListener('input',()=>{ const p=document.getElementById('c2mHostPreview'); if(p) p.textContent=el.value; }); })();
async function c2mTest(type){
  const b=c2mGetBase();
  const outEl='c2mOut';
  function cOut(d){ out(outEl,d); }
  try{
    if(type==='public'){
      const r=await fetchJson(b+'/api/public/info'); cOut({test:'public', base:b, ...r});
    } else if(type==='basic'){
      const h='Basic '+btoa('admin:admin123');
      const r=await fetchJson(b+'/api/basic/data',{headers:{Authorization:h}}); cOut({test:'basic', base:b, auth:'Basic admin:admin123', ...r});
    } else if(type==='digest'){
      const du='admin', dp='admin123';
      const first=await fetch(b+'/api/digest/data');
      const www=first.headers.get('WWW-Authenticate');
      if(!www){ cOut({test:'digest', error:'No WWW-Authenticate', status:first.status, base:b}); return; }
      const p={}; www.replace(/(\w+)="([^"]+)"/g, (_,k,v)=>p[k]=v);
      const realm=p.realm, nonce=p.nonce, opaque=p.opaque, qop=p.qop||'auth', uri='/api/digest/data', nc='00000001', cnonce=Math.random().toString(36).slice(2,10);
      const HA1=await md5js(`${du}:${realm}:${dp}`), HA2=await md5js(`GET:${uri}`), resp=await md5js(`${HA1}:${nonce}:${nc}:${cnonce}:${qop}:${HA2}`);
      const hdr=`Digest username="${du}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${resp}", opaque="${opaque}"`;
      const r=await fetchJson(b+'/api/digest/data',{headers:{Authorization:hdr}}); cOut({test:'digest', base:b, ...r});
    } else if(type==='oauth1'){
      const ck='oauth1_consumer_key', cs='oauth1_consumer_secret_123', tk='oauth1_token_abc', ts='oauth1_token_secret_xyz';
      const nonce=Math.random().toString(36).slice(2,10), tsNow=Math.floor(Date.now()/1000).toString();
      const params={oauth_consumer_key:ck, oauth_token:tk, oauth_signature_method:'HMAC-SHA1', oauth_timestamp:tsNow, oauth_nonce:nonce, oauth_version:'1.0'};
      const url=b+'/api/oauth1/data';
      const all=Object.keys(params).sort().map(k=>`${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
      const baseStr=`GET&${encodeURIComponent(url)}&${encodeURIComponent(all)}`;
      const key=encodeURIComponent(cs)+'&'+encodeURIComponent(ts);
      const sig=await hmacSHA1(key, baseStr);
      const hdr=`OAuth oauth_consumer_key="${ck}", oauth_token="${tk}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${tsNow}", oauth_nonce="${nonce}", oauth_version="1.0", oauth_signature="${encodeURIComponent(sig)}"`;
      const r=await fetchJson(url,{headers:{Authorization:hdr}}); cOut({test:'oauth1', base:b, signature:sig, ...r});
    } else if(type==='oauth1a'){
      const r1=await fetchJson(b+'/api/oauth1a/request_token'); const tok=r1.body.oauth_token;
      const r2=await fetchJson(b+'/api/oauth1a/authorize?oauth_token='+encodeURIComponent(tok)); const ver=r2.body.oauth_verifier;
      const r3=await fetchJson(b+'/api/oauth1a/access_token?oauth_token='+encodeURIComponent(tok)+'&oauth_verifier='+encodeURIComponent(ver));
      const at=r3.body.oauth_token;
      const r4=await fetchJson(b+'/api/oauth1a/data',{headers:{Authorization:`OAuth oauth_token="${at}"`}});
      cOut({test:'oauth1a', base:b, steps:{request_token:r1, authorize:r2, access_token:r3, data:r4}});
    } else if(type==='oauth2'){
      const tokRes=await fetchJson(b+'/api/oauth2/token',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({grant_type:'password', username:'john', password:'john123', client_id:'client_app_123', client_secret:'client_secret_abc_123'})});
      const tok=tokRes.body.access_token;
      const r=await fetchJson(b+'/api/oauth2/data',{headers:{Authorization:'Bearer '+tok}});
      cOut({test:'oauth2', base:b, token:tok?.slice(0,20)+'...', tokenRes:tokRes, data:r});
    } else if(type==='oauth2token'){
      const r=await fetchJson(b+'/api/oauth2/token',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({grant_type:'password', username:'john', password:'john123', client_id:'client_app_123', client_secret:'client_secret_abc_123'})});
      cOut({test:'oauth2token', base:b, ...r});
    } else if(type==='realtime'){
      const r=await fetchJson(b+'/api/public/data'); cOut({test:'realtime', base:b, realtime:r.body.realtime, full:r});
    }
  }catch(e){ out(outEl,{test:type, base:c2mGetBase(), error:e.message}); }
}
async function c2mRunAll(){
  const b=c2mGetBase();
  out('c2mOut',{running:'C2M Run All for '+b, at:new Date().toISOString()});
  const tests=['public','basic','digest','oauth1','oauth1a','oauth2','realtime'];
  const results={};
  for(const t of tests){
    try{ await c2mTest(t); await new Promise(r=>setTimeout(r,600)); const cur=document.getElementById('c2mOut').textContent; try{ results[t]=JSON.parse(cur).status || JSON.parse(cur).test; }catch{ results[t]=cur.slice(0,60);} }catch(e){ results[t]='error '+e.message; }
  }
  const summary=document.getElementById('c2mSummary');
  if(summary){
    summary.innerHTML=Object.entries(results).map(([k,v])=>`<div class="p-2 rounded ${String(v).includes('200')||String(v).includes('OK')?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}"><div class="font-bold">${k}</div><div class="truncate">${String(v).slice(0,40)}</div></div>`).join('');
  }
  // also show summary in out
  const cur=document.getElementById('c2mOut').textContent;
  out('c2mOut',{base:b, summary:results, last:cur.slice(0,800)});
}
window.c2mGetBase=c2mGetBase; window.c2mSetBase=c2mSetBase; window.c2mSaveBaseUrl=c2mSaveBaseUrl; window.c2mUseCurrent=c2mUseCurrent; window.c2mPasteTunnel=c2mPasteTunnel; window.c2mTest=c2mTest; window.c2mRunAll=c2mRunAll;

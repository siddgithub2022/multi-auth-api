// Runner logic
let base = location.origin;
document.getElementById('baseUrl').textContent = base;
(async()=>{
  for(const cand of [location.origin, 'http://localhost:3000']){
    try{
      const r=await fetch(cand+'/api/config');
      if(r.ok){ const j=await r.json(); if(j.baseUrl){ base=j.baseUrl; document.getElementById('baseUrl').textContent=base;
        const el=document.getElementById('runnerUnifiedBaseUrl'); if(el) el.textContent=base;
        const el2=document.getElementById('unifiedBaseUrl'); if(el2) el2.textContent=base; const d=document.getElementById('dashBaseUrl'); if(d) d.textContent=base; break; }}
    }catch{}
  }
})();

function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return document.querySelectorAll(sel); }

// Tabs
qsa('[data-btab]').forEach(b=>{
  b.addEventListener('click', ()=>{
    qsa('[data-btab]').forEach(x=>{x.className='btab bg-gray-100 px-4 py-2'}); 
    b.className='btab bg-gray-900 text-white px-4 py-2 font-semibold';
    const t=b.dataset.btab;
    qsa('[data-bpanel]').forEach(p=> p.classList.toggle('hidden', p.dataset.bpanel!==t));
  });
});
qsa('[data-rtab]').forEach(b=>{
  b.addEventListener('click', ()=>{
    qsa('[data-rtab]').forEach(x=>{x.className='rtab bg-gray-100 px-4 py-2'});
    b.className='rtab bg-gray-900 text-white px-4 py-2 font-semibold';
    const t=b.dataset.rtab;
    qsa('[data-rpanel]').forEach(p=> p.classList.toggle('hidden', p.dataset.rpanel!==t));
  });
});

// Auth visibility
const authType = qs('#authType');
function updateAuth(){
  const v = authType.value;
  qs('#authBasic').classList.toggle('hidden', v!=='basic');
  qs('#authDigest').classList.toggle('hidden', v!=='digest');
  qs('#authBearer').classList.toggle('hidden', v!=='bearer');
  qs('#authOAuth1').classList.toggle('hidden', v!=='oauth1');
  qs('#authOAuth1a').classList.toggle('hidden', v!=='oauth1a');
}
authType.addEventListener('change', updateAuth);
updateAuth();

// Headers / Params dynamic
let headers = [{k:'Content-Type', v:'application/json', enabled:true}];
let params = [];

function renderHeaders(){
  const c = qs('#headersList');
  c.innerHTML = headers.map((h,i)=> `
    <div class="flex gap-2 items-center">
      <input type="checkbox" ${h.enabled?'checked':''} onchange="headers[${i}].enabled=this.checked">
      <input value="${h.k}" placeholder="Header" class="flex-1 border rounded px-2 py-1 text-xs code" oninput="headers[${i}].k=this.value">
      <input value="${h.v}" placeholder="Value" class="flex-1 border rounded px-2 py-1 text-xs code" oninput="headers[${i}].v=this.value">
      <button onclick="headers.splice(${i},1);renderHeaders()" class="text-red-500 text-xs"><i class="fa-solid fa-xmark"></i></button>
    </div>
  `).join('');
}
function addHeader(){ headers.push({k:'',v:'',enabled:true}); renderHeaders(); }
function renderParams(){
  const c = qs('#paramsList');
  c.innerHTML = params.map((p,i)=> `
    <div class="flex gap-2 items-center">
      <input type="checkbox" ${p.enabled?'checked':''} onchange="params[${i}].enabled=this.checked">
      <input value="${p.k}" placeholder="Key" class="flex-1 border rounded px-2 py-1 text-xs code" oninput="params[${i}].k=this.value">
      <input value="${p.v}" placeholder="Value" class="flex-1 border rounded px-2 py-1 text-xs code" oninput="params[${i}].v=this.value">
      <button onclick="params.splice(${i},1);renderParams()" class="text-red-500 text-xs"><i class="fa-solid fa-xmark"></i></button>
    </div>
  `).join('');
}
function addParam(){ params.push({k:'',v:'',enabled:true}); renderParams(); }
renderHeaders(); renderParams();

// Body helper
qs('#bodyType').addEventListener('change', e=>{
  const t=e.target.value;
  const ta=qs('#bodyContent');
  if(t==='none') ta.placeholder='No body';
  if(t==='json') { ta.placeholder='{"hello":"world"}'; if(!ta.value) ta.value='{\n  "hello": "world"\n}'; }
  if(t==='form') ta.placeholder='key=value&key2=value2';
});

// Preset loader
qs('#fillPreset').addEventListener('click', ()=>{
  const v = qs('#presetSelect').value;
  if(!v) return; const [method, url] = v.split('|');
  qs('#method').value = method;
  qs('#url').value = url;
  // auto set auth type based on preset
  if(url.includes('/api/basic')) { qs('#authType').value='basic'; updateAuth(); }
  else if(url.includes('/api/digest')) { qs('#authType').value='digest'; updateAuth(); }
  else if(url.includes('/api/oauth2/data') || url.includes('/api/oauth2')) { qs('#authType').value='bearer'; updateAuth(); }
  else if(url.includes('/api/oauth1/') && !url.includes('oauth1a')) { qs('#authType').value='oauth1'; updateAuth(); }
  else if(url.includes('/api/oauth1a')) { qs('#authType').value='oauth1a'; updateAuth(); }
  else { qs('#authType').value='none'; updateAuth(); }
  if(method==='POST' && url.includes('/api/public/echo')){ qs('#bodyType').value='json'; qs('#bodyContent').value='{\n  "hello": "world",\n  "time": "'+new Date().toISOString()+'"\n}'; }
  if(method==='POST' && url.includes('/api/oauth2/token')){ qs('#bodyType').value='json'; qs('#bodyContent').value='{\n  "grant_type": "password",\n  "username": "john",\n  "password": "john123",\n  "client_id": "client_app_123",\n  "client_secret": "client_secret_abc_123"\n}'; }
});

// Helpers
function formatJson(){
  try{ const j=JSON.parse(qs('#bodyContent').value); qs('#bodyContent').value=JSON.stringify(j,null,2); }catch(e){ alert('Invalid JSON: '+e.message); }
}
function clearRunner(){
  qs('#url').value='/api/public/info'; qs('#method').value='GET'; qs('#bodyContent').value=''; qs('#authType').value='none'; updateAuth();
  headers=[{k:'Content-Type',v:'application/json',enabled:true}]; params=[]; renderHeaders(); renderParams();
}

// Server status
async function checkServer(){
  try{
    const r=await fetch(base+'/health'); const j=await r.json();
    qs('#serverTxt').textContent='online';
    qs('#serverDot').querySelector('span').className='w-2 h-2 bg-green-500 rounded-full animate-pulse';
  }catch{
    qs('#serverTxt').textContent='offline';
    qs('#serverDot').querySelector('span').className='w-2 h-2 bg-red-500 rounded-full';
  }
}
checkServer();

// Curl preview
function buildCurl(){
  const method=qs('#method').value;
  let url = qs('#url').value;
  if(!url.startsWith('http')) url = base + (url.startsWith('/')?'':'/')+url;
  // add params
  const qp = params.filter(p=>p.enabled&&p.k).map(p=> encodeURIComponent(p.k)+'='+encodeURIComponent(p.v)).join('&');
  if(qp) url += (url.includes('?')?'&':'?')+qp;
  let curl = `curl -X ${method} "${url}"`;
  const hdrs = buildHeadersPreview();
  for(const [k,v] of Object.entries(hdrs)) curl += ` \\\n  -H "${k}: ${v}"`;
  const bodyType=qs('#bodyType').value;
  const body=qs('#bodyContent').value.trim();
  if(body && bodyType!=='none' && method!=='GET' && method!=='HEAD') curl += ` \\\n  -d '${body.replace(/'/g,"'\\''")}'`;
  return curl;
}
function toggleCurl(){
  const el=qs('#curlPreview');
  if(el.classList.contains('hidden')){ el.textContent=buildCurl(); el.classList.remove('hidden');}
  else el.classList.add('hidden');
}
function buildHeadersPreview(){
  const out={};
  headers.filter(h=>h.enabled&&h.k).forEach(h=> out[h.k]=h.v);
  const auth=authType.value;
  if(auth==='basic'){
    const u=qs('#basicUser').value, p=qs('#basicPass').value;
    out['Authorization']='Basic '+btoa(u+':'+p);
  } else if(auth==='bearer'){
    const t=qs('#bearerToken').value.trim();
    if(t) out['Authorization']='Bearer '+t;
  } else if(auth==='oauth1a'){
    const t=qs('#o1aToken').value.trim();
    if(t) out['Authorization']='OAuth oauth_token="'+t+'"';
  }
  // oauth1 and digest handled separately (digest needs handshake)
  return out;
}

// Auth token fetchers
async function fetchToken(kind){
  let body;
  if(kind==='password'){
    const u=qs('#o2User').value, p=qs('#o2Pass').value;
    body={grant_type:'password', username:u, password:p, client_id:'client_app_123', client_secret:'client_secret_abc_123'};
  } else if(kind==='client_credentials'){
    body={grant_type:'client_credentials', client_id:'client_app_123', client_secret:'client_secret_abc_123'};
  } else if(kind==='auth_code'){
    // step 1: get code, step2 exchange
    try{
      const r1=await fetch(base+'/api/oauth2/authorize?response_type=code&client_id=client_app_123&redirect_uri=http://localhost:3000/callback&user=john');
      const j1=await r1.json();
      const code=j1.code || (j1.redirect_uri && new URL(j1.redirect_uri).searchParams.get('code'));
      if(!code) throw new Error('No code: '+JSON.stringify(j1));
      body={grant_type:'authorization_code', code, client_id:'client_app_123', client_secret:'client_secret_abc_123', redirect_uri:'http://localhost:3000/callback'};
    }catch(e){ alert('Auth code fetch failed: '+e.message); return; }
  }
  try{
    const r=await fetch(base+'/api/oauth2/token',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
    const j=await r.json();
    if(j.access_token){
      qs('#bearerToken').value=j.access_token;
      qs('#respBody').textContent=JSON.stringify(j,null,2);
      updateBadges(200,0,JSON.stringify(j).length,{});
      addLog(`Token fetched via ${kind}`, j);
    } else {
      alert('Token error: '+JSON.stringify(j,null,2));
      qs('#respBody').textContent=JSON.stringify(j,null,2);
    }
  }catch(e){ alert(e.message); }
}

let o1aRequestToken=null, o1aVerifier=null;
async function o1aStep(step){
  try{
    if(step==='request'){
      const r=await fetch(base+'/api/oauth1a/request_token'); const j=await r.json();
      o1aRequestToken=j.oauth_token; qs('#o1aToken').value=o1aRequestToken; qs('#respBody').textContent=JSON.stringify(j,null,2); addLog('OAuth1a request_token',j); alert('Request token: '+o1aRequestToken+' - now click Authorize');
    } else if(step==='authorize'){
      if(!o1aRequestToken) o1aRequestToken=qs('#o1aToken').value;
      if(!o1aRequestToken) return alert('Need request token first');
      const r=await fetch(base+'/api/oauth1a/authorize?oauth_token='+encodeURIComponent(o1aRequestToken)); const j=await r.json();
      o1aVerifier=j.oauth_verifier; qs('#respBody').textContent=JSON.stringify(j,null,2); addLog('OAuth1a authorize',j);
      // auto call access after short
      if(o1aVerifier){
        const r2=await fetch(base+'/api/oauth1a/access_token?oauth_token='+encodeURIComponent(o1aRequestToken)+'&oauth_verifier='+encodeURIComponent(o1aVerifier)); const j2=await r2.json();
        qs('#o1aToken').value=j2.oauth_token; qs('#respBody').textContent=JSON.stringify(j2,null,2); addLog('OAuth1a access_token',j2);
      }
    } else if(step==='access'){
      const tok=qs('#o1aToken').value; const ver=o1aVerifier || prompt('oauth_verifier');
      const r=await fetch(base+'/api/oauth1a/access_token?oauth_token='+encodeURIComponent(tok)+'&oauth_verifier='+encodeURIComponent(ver)); const j=await r.json();
      qs('#o1aToken').value=j.oauth_token; qs('#respBody').textContent=JSON.stringify(j,null,2); addLog('OAuth1a access',j);
    }
  }catch(e){ qs('#respBody').textContent='Error: '+e.message; }
}

// Send logic
let lastResponseText='';
qs('#sendBtn').addEventListener('click', sendRequest);
async function sendRequest(){
  const method=qs('#method').value;
  let urlVal=qs('#url').value.trim();
  if(!urlVal) return alert('URL required');
  if(!urlVal.startsWith('http')) urlVal = base + (urlVal.startsWith('/')?'':'/')+urlVal;
  // add query params
  const qp = params.filter(p=>p.enabled&&p.k).map(p=> encodeURIComponent(p.k)+'='+encodeURIComponent(p.v)).join('&');
  if(qp) urlVal += (urlVal.includes('?')?'&':'?')+qp;

  const headersToSend = buildHeadersPreview();
  // body
  const bodyType=qs('#bodyType').value;
  let body=null;
  if(bodyType!=='none' && method!=='GET' && method!=='HEAD'){
    const raw=qs('#bodyContent').value;
    if(raw){
      if(bodyType==='json'){
        headersToSend['Content-Type']='application/json';
        body=raw;
        try{ JSON.parse(raw);}catch(e){ /* let server validate */ }
      } else if(bodyType==='form'){
        headersToSend['Content-Type']='application/x-www-form-urlencoded';
        body=raw;
      } else body=raw;
    }
  }

  // Auth special handling
  const auth=authType.value;
  const t0=performance.now();
  let response, text, status=0, ok=false;
  let respHeaders={};

  // Digest: two-step
  if(auth==='digest'){
    const du=qs('#digestUser').value, dp=qs('#digestPass').value;
    // first try without, get 401
    let first = await fetch(urlVal, {method, headers: {...headersToSend}});
    const www = first.headers.get('WWW-Authenticate') || first.headers.get('www-authenticate');
    if(first.status===401 && www && www.includes('Digest')){
      // parse
      const p={}; www.replace(/(\w+)="([^"]+)"/g, (_,k,v)=> p[k]=v);
      const realm=p.realm, nonce=p.nonce, opaque=p.opaque, qop=p.qop||'auth';
      const uri = new URL(urlVal).pathname + (new URL(urlVal).search||'');
      const nc='00000001', cnonce=Math.random().toString(36).slice(2,10);
      const HA1=await md5(`${du}:${realm}:${dp}`);
      const HA2=await md5(`${method}:${uri}`);
      const resp=await md5(`${HA1}:${nonce}:${nc}:${cnonce}:${qop}:${HA2}`);
      const authHeader = `Digest username="${du}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${resp}", opaque="${opaque}"`;
      headersToSend['Authorization']=authHeader;
      response = await fetch(urlVal, {method, headers: headersToSend, body});
    } else {
      response = first;
    }
  } else if(auth==='oauth1'){
    const ck=qs('#o1Key').value, cs=qs('#o1Secret').value, tk=qs('#o1Token').value, ts=qs('#o1TokenSecret').value;
    const nonce=Math.random().toString(36).slice(2,10), tsNow=Math.floor(Date.now()/1000).toString();
    const oauthParams={oauth_consumer_key:ck, oauth_token:tk, oauth_signature_method:'HMAC-SHA1', oauth_timestamp:tsNow, oauth_nonce:nonce, oauth_version:'1.0'};
    // build base string
    const parsed = new URL(urlVal);
    const baseUrl = parsed.origin + parsed.pathname;
    const all = new URLSearchParams(parsed.search);
    for(const [k,v] of Object.entries(oauthParams)) all.append(k,v);
    if(body && headersToSend['Content-Type']==='application/x-www-form-urlencoded'){
      new URLSearchParams(body).forEach((v,k)=> all.append(k,v));
    }
    const sorted = Array.from(all.entries()).sort((a,b)=> a[0].localeCompare(b[0])).map(([k,v])=> `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    const baseStr = `${method}&${encodeURIComponent(baseUrl)}&${encodeURIComponent(sorted)}`;
    const signingKey = encodeURIComponent(cs)+'&'+encodeURIComponent(ts);
    const sig = await hmacSHA1(signingKey, baseStr);
    const header = `OAuth oauth_consumer_key="${ck}", oauth_token="${tk}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${tsNow}", oauth_nonce="${nonce}", oauth_version="1.0", oauth_signature="${encodeURIComponent(sig)}"`;
    headersToSend['Authorization']=header;
    response = await fetch(urlVal, {method, headers: headersToSend, body});
  } else {
    response = await fetch(urlVal, {method, headers: headersToSend, body});
  }

  const t1=performance.now();
  const elapsed=(t1-t0).toFixed(0);
  status=response.status; ok=response.ok;
  respHeaders={}; response.headers.forEach((v,k)=> respHeaders[k]=v);
  text=await response.text();
  let pretty=text;
  try{ const j=JSON.parse(text); pretty=JSON.stringify(j,null,2); }catch{}

  lastResponseText=text;
  qs('#respBody').textContent=pretty;
  qs('#respRaw').textContent=text;
  qs('#respHeaders').textContent=JSON.stringify(respHeaders,null,2) + '\n\nStatus: '+status;
  updateBadges(status, elapsed, text.length, respHeaders);
  addLog(`${method} ${urlVal} → ${status}`, {request:{method,url:urlVal,headers:headersToSend,body}, response:{status,headers:respHeaders,body:pretty}});
  saveHistory();
  // curl preview update
  qs('#curlPreview').textContent=buildCurl();
  qs('#curlPreview').classList.add('hidden');
}

function updateBadges(status, ms, size, headers){
  const badge=qs('#statusBadge');
  badge.textContent=status+ (status===200?' OK': status===401?' Unauthorized': status===404?' Not Found':'' );
  badge.className='text-white text-xs px-2 py-1 rounded font-bold ' + (status>=200&&status<300?'status-2xx': status>=400&&status<500?'status-4xx': status>=500?'status-5xx':'status-0');
  qs('#timeBadge').textContent=ms+' ms';
  qs('#sizeBadge').textContent=(size/1024).toFixed(2)+' KB';
  qs('#timeInfo').textContent=ms+' ms';
}

function viewMode(m){
  // keep body panel visible, toggle pretty/raw inside? We already have tabs, but this toggles inside body
}
function filterJson(){
  const q=qs('#searchResp').value.toLowerCase();
  if(!q){ // restore
    try{ const j=JSON.parse(lastResponseText); qs('#respBody').textContent=JSON.stringify(j,null,2); }catch{ qs('#respBody').textContent=lastResponseText; }
    return;
  }
  try{
    const j=JSON.parse(lastResponseText);
    const filtered = JSON.stringify(j,null,2).split('\n').filter(l=> l.toLowerCase().includes(q)).join('\n');
    qs('#respBody').textContent=filtered || '(no match)';
  }catch{
    qs('#respBody').textContent=lastResponseText.split('\n').filter(l=> l.toLowerCase().includes(q)).join('\n');
  }
}
function copyResponse(){ navigator.clipboard.writeText(qs('#respBody').textContent); }
function downloadResponse(){
  const blob=new Blob([qs('#respBody').textContent],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='response.json'; a.click();
}
function addLog(title, data){
  const el=qs('#reqLog');
  const ts=new Date().toLocaleTimeString();
  el.textContent=`[${ts}] ${title}\n` + el.textContent.slice(0,4000);
}

// History
function saveHistory(force){
  const entry={method:qs('#method').value, url:qs('#url').value, auth:qs('#authType').value, time:new Date().toISOString()};
  let h=JSON.parse(localStorage.getItem('runnerHistory')||'[]');
  if(force || (h[0] && h[0].url===entry.url && h[0].method===entry.method)) return;
  h.unshift(entry); h=h.slice(0,20); localStorage.setItem('runnerHistory', JSON.stringify(h)); renderHistory();
}
function renderHistory(){
  const h=JSON.parse(localStorage.getItem('runnerHistory')||'[]');
  qs('#historyList').innerHTML = h.map((e,i)=> `<div class="flex items-center gap-2 hover:bg-gray-50 p-1 rounded cursor-pointer" onclick="loadHist(${i})"><span class="font-bold">${e.method}</span><span class="truncate">${e.url}</span><span class="ml-auto text-gray-400">${e.auth}</span></div>`).join('') || '<span class="text-gray-400">No history</span>';
}
function loadHist(i){
  const h=JSON.parse(localStorage.getItem('runnerHistory')||'[]')[i];
  if(!h) return;
  qs('#method').value=h.method; qs('#url').value=h.url; qs('#authType').value=h.auth; updateAuth();
}
function clearHistory(){ localStorage.removeItem('runnerHistory'); renderHistory(); }
renderHistory();

// Crypto helpers
async function md5(str){
  // same minimal md5 as app.js
  function cmn(q,a,b,x,s,t){a=add32(add32(a,q),add32(x,t));return add32((a<<s)|(a>>>32-s),b)}
  function ff(a,b,c,d,x,s,t){return cmn((b&c)|(~b&d),a,b,x,s,t)}
  function gg(a,b,c,d,x,s,t){return cmn((b&d)|(c&~d),a,b,x,s,t)}
  function hh(a,b,c,d,x,s,t){return cmn(b^c^d,a,b,x,s,t)}
  function ii(a,b,c,d,x,s,t){return cmn(c^(b|~d),a,b,x,s,t)}
  function md5blk(s){var md5blks=[],i;for(i=0;i<64;i+=4){md5blks[i>>2]=s.charCodeAt(i)+(s.charCodeAt(i+1)<<8)+(s.charCodeAt(i+2)<<16)+(s.charCodeAt(i+3)<<24)}return md5blks}
  function rhex(n){var s='',j;for(j=0;j<4;j++)s+=('0'+((n>>j*8)&0xFF).toString(16)).slice(-2);return s}
  function add32(a,b){return (a+b)&0xFFFFFFFF}
  function md5calc(s){var n=s.length,a=1732584193,b=-271733879,c=-1732584194,d=271733878,i;for(i=64;i<=s.length;i+=64){var blk=md5blk(s.substring(i-64,i));var olda=a,oldb=b,oldc=c,oldd=d;a=ff(a,b,c,d,blk[0],7,-680876936);d=ff(d,a,b,c,blk[1],12,-389564586);c=ff(c,d,a,b,blk[2],17,606105819);b=ff(b,c,d,a,blk[3],22,-1044525330);a=ff(a,b,c,d,blk[4],7,-176418897);d=ff(d,a,b,c,blk[5],12,1200080426);c=ff(c,d,a,b,blk[6],17,-1473231341);b=ff(b,c,d,a,blk[7],22,-45705983);a=ff(a,b,c,d,blk[8],7,1770035416);d=ff(d,a,b,c,blk[9],12,-1958414417);c=ff(c,d,a,b,blk[10],17,-42063);b=ff(b,c,d,a,blk[11],22,-1990404162);a=ff(a,b,c,d,blk[12],7,1804603682);d=ff(d,a,b,c,blk[13],12,-40341101);c=ff(c,d,a,b,blk[14],17,-1502002290);b=ff(b,c,d,a,blk[15],22,1236535329);a=gg(a,b,c,d,blk[1],5,-165796510);d=gg(d,a,b,c,blk[6],9,-1069501632);c=gg(c,d,a,b,blk[11],14,643717713);b=gg(b,c,d,a,blk[0],20,-373897302);a=gg(a,b,c,d,blk[5],5,-701558691);d=gg(d,a,b,c,blk[10],9,38016083);c=gg(c,d,a,b,blk[15],14,-660478335);b=gg(b,c,d,a,blk[4],20,-405537848);a=gg(a,b,c,d,blk[9],5,568446438);d=gg(d,a,b,c,blk[14],9,-1019803690);c=gg(c,d,a,b,blk[3],14,-187363961);b=gg(b,c,d,a,blk[8],20,1163531501);a=gg(a,b,c,d,blk[13],5,-1444681467);d=gg(d,a,b,c,blk[2],9,-51403784);c=gg(c,d,a,b,blk[7],14,1735328473);b=gg(b,c,d,a,blk[12],20,-1926607734);a=hh(a,b,c,d,blk[5],4,-378558);d=hh(d,a,b,c,blk[8],11,-2022574463);c=hh(c,d,a,b,blk[11],16,1839030562);b=hh(b,c,d,a,blk[14],23,-35309556);a=hh(a,b,c,d,blk[1],4,-1530992060);d=hh(d,a,b,c,blk[4],11,1272893353);c=hh(c,d,a,b,blk[7],16,-155497632);b=hh(b,c,d,a,blk[10],23,-1094730640);a=hh(a,b,c,d,blk[13],4,681279174);d=hh(d,a,b,c,blk[0],11,-358537222);c=hh(c,d,a,b,blk[3],16,-722521979);b=hh(b,c,d,a,blk[6],23,76029189);a=hh(a,b,c,d,blk[9],4,-640364487);d=hh(d,a,b,c,blk[12],11,-421815835);c=hh(c,d,a,b,blk[15],16,530742520);b=hh(b,c,d,a,blk[2],23,-995338651);a=ii(a,b,c,d,blk[0],6,-198630844);d=ii(d,a,b,c,blk[7],10,1126891415);c=ii(c,d,a,b,blk[14],15,-1416354905);b=ii(b,c,d,a,blk[5],21,-57434055);a=ii(a,b,c,d,blk[12],6,1700485571);d=ii(d,a,b,c,blk[3],10,-1894986606);c=ii(c,d,a,b,blk[10],15,-1051523);b=ii(b,c,d,a,blk[1],21,-2054922799);a=ii(a,b,c,d,blk[8],6,1873313359);d=ii(d,a,b,c,blk[15],10,-30611744);c=ii(c,d,a,b,blk[6],15,-1560198380);b=ii(b,c,d,a,blk[13],21,1309151649);a=ii(a,b,c,d,blk[4],6,-145523070);d=ii(d,a,b,c,blk[11],10,-1120210379);c=ii(c,d,a,b,blk[2],15,718787259);b=ii(b,c,d,a,blk[9],21,-343485551);a=add32(a,olda);b=add32(b,oldb);c=add32(c,oldc);d=add32(d,oldd)}return rhex(a)+rhex(b)+rhex(c)+rhex(d)}
  return md5calc(str);
}
async function hmacSHA1(key, data){
  const enc=new TextEncoder();
  const k=await crypto.subtle.importKey('raw', enc.encode(key), {name:'HMAC', hash:'SHA-1'}, false, ['sign']);
  const s=await crypto.subtle.sign('HMAC', k, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(s)));
}

// expose
window.addHeader=addHeader; window.addParam=addParam; window.fetchToken=fetchToken; window.o1aStep=o1aStep; window.formatJson=formatJson; window.toggleCurl=toggleCurl; window.clearRunner=clearRunner; window.clearHistory=clearHistory; window.loadHist=loadHist; window.copyResponse=copyResponse; window.downloadResponse=downloadResponse; window.viewMode=viewMode; window.filterJson=filterJson; window.saveHistory=saveHistory;

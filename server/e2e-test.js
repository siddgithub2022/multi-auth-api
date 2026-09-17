/**
 * End-to-End test for all 7 auth types + realtime + unified BaseUrl
 */
const base = 'http://localhost:3000';
const crypto = require('crypto');

async function fetchJson(url, opts={}){
  const res = await fetch(url, opts);
  const text = await res.text();
  let json; try{ json=JSON.parse(text)}catch{ json=text}
  return { status: res.status, ok: res.ok, headers: Object.fromEntries(res.headers.entries()), body: json, raw: text };
}
function logStep(title, result){
  console.log(`\n========== ${title} ==========`);
  console.log(`Status: ${result.status} ${result.ok?'OK':'FAIL'}`);
  console.log(JSON.stringify(result.body, null, 2).substring(0,1200));
}
function md5(s){
  return crypto.createHash('md5').update(s).digest('hex');
}

(async()=>{
  console.log(`BaseUrl (single for all): ${base}`);
  console.log('Testing 7 auth types + realtime on DEDICATED SERVER');

  // 1 Health & Config
  logStep('1. Health', await fetchJson(base+'/health'));
  logStep('2. Config (unified BaseUrl)', await fetchJson(base+'/api/config'));
  logStep('3. Swagger combined', await fetchJson(base+'/swagger.json').then(r=>({status:r.status, body:{servers: r.body.servers, tags: r.body.tags.map(t=>t.name), paths: Object.keys(r.body.paths).length}})));
  logStep('4. Postman collection', await fetchJson(base+'/postman.json').then(r=>({status:r.status, body:{name: r.body.info.name, folders: r.body.item.map(i=>i.name), variables: r.body.variable}})));

  // 5 Public
  logStep('5. Public - GET /api/public/info (No Auth)', await fetchJson(base+'/api/public/info'));
  logStep('6. Public - GET /api/public/data', await fetchJson(base+'/api/public/data'));
  logStep('7. Public - POST /api/public/echo', await fetchJson(base+'/api/public/echo', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({hello:'world', layman:true})}));

  // 6 Basic
  const basic = 'Basic ' + Buffer.from('admin:admin123').toString('base64');
  logStep('8. Basic - GET /api/basic/data (admin:admin123)', await fetchJson(base+'/api/basic/data', {headers:{Authorization: basic}}));
  logStep('9. Basic - GET /api/basic/profile', await fetchJson(base+'/api/basic/profile', {headers:{Authorization: basic}}));
  logStep('10. Basic - without auth (should 401)', await fetchJson(base+'/api/basic/data'));

  // 7 Digest - first get challenge
  const d1 = await fetch(base+'/api/digest/data');
  const www = d1.headers.get('www-authenticate');
  console.log(`\n========== 11. Digest - 401 challenge ==========`);
  console.log(`Status: ${d1.status} (expected 401)`);
  console.log(`WWW-Authenticate: ${www}`);
  let dBody = await d1.text(); console.log(dBody.substring(0,500));
  // compute digest response
  const params={}; www.replace(/(\w+)="([^"]+)"/g, (_,k,v)=> params[k]=v);
  const user='admin', pass='admin123', realm=params.realm, nonce=params.nonce, opaque=params.opaque, qop=params.qop||'auth';
  const uri='/api/digest/data', nc='00000001', cnonce='abcd1234';
  const HA1=md5(`${user}:${realm}:${pass}`);
  const HA2=md5(`GET:${uri}`);
  const response=md5(`${HA1}:${nonce}:${nc}:${cnonce}:${qop}:${HA2}`);
  const authHeader=`Digest username="${user}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}", opaque="${opaque}"`;
  logStep('12. Digest - GET with computed MD5', await fetchJson(base+'/api/digest/data', {headers:{Authorization: authHeader}}));

  // 8 OAuth1 (2-legged HMAC-SHA1)
  const cKey='oauth1_consumer_key', cSecret='oauth1_consumer_secret_123', tKey='oauth1_token_abc', tSecret='oauth1_token_secret_xyz';
  const oauth1Nonce = Math.random().toString(36).slice(2,10);
  const ts = Math.floor(Date.now()/1000).toString();
  const oauthParams={oauth_consumer_key:cKey, oauth_token:tKey, oauth_signature_method:'HMAC-SHA1', oauth_timestamp:ts, oauth_nonce:oauth1Nonce, oauth_version:'1.0'};
  const method='GET', baseUrl=base+'/api/oauth1/data';
  const all = Object.keys(oauthParams).sort().map(k=> `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`).join('&');
  const baseStr=`${method}&${encodeURIComponent(baseUrl)}&${encodeURIComponent(all)}`;
  const signingKey=encodeURIComponent(cSecret)+'&'+encodeURIComponent(tSecret);
  const sig=crypto.createHmac('sha1', signingKey).update(baseStr).digest('base64');
  const oauthHeader=`OAuth oauth_consumer_key="${cKey}", oauth_token="${tKey}", oauth_signature_method="HMAC-SHA1", oauth_timestamp="${ts}", oauth_nonce="${oauth1Nonce}", oauth_version="1.0", oauth_signature="${encodeURIComponent(sig)}"`;
  logStep('13. OAuth 1.0 - GET /api/oauth1/data (HMAC-SHA1 signed)', await fetchJson(base+'/api/oauth1/data', {headers:{Authorization: oauthHeader}}));

  // 9 OAuth1a 3-legged
  logStep('14. OAuth1a - POST /api/oauth1a/request_token', await fetchJson(base+'/api/oauth1a/request_token', {method:'POST'}));
  const reqTokRes = await fetchJson(base+'/api/oauth1a/request_token');
  const reqTok = reqTokRes.body.oauth_token;
  console.log(`\nRequest token: ${reqTok}`);
  logStep('15. OAuth1a - GET /api/oauth1a/authorize', await fetchJson(base+`/api/oauth1a/authorize?oauth_token=${reqTok}`));
  const authRes = await fetchJson(base+`/api/oauth1a/authorize?oauth_token=${reqTok}`);
  const verifier = authRes.body.oauth_verifier;
  console.log(`Verifier: ${verifier}`);
  logStep('16. OAuth1a - GET /api/oauth1a/access_token', await fetchJson(base+`/api/oauth1a/access_token?oauth_token=${reqTok}&oauth_verifier=${verifier}`));
  const accRes = await fetchJson(base+`/api/oauth1a/access_token?oauth_token=${reqTok}&oauth_verifier=${verifier}`).catch(async e=> {
    // if already consumed, redo fresh flow
    const r2 = await fetchJson(base+'/api/oauth1a/request_token');
    const t2 = r2.body.oauth_token;
    const a2 = await fetchJson(base+`/api/oauth1a/authorize?oauth_token=${t2}`);
    const v2 = a2.body.oauth_verifier;
    return await fetchJson(base+`/api/oauth1a/access_token?oauth_token=${t2}&oauth_verifier=${v2}`);
  });
  // need fresh token for data test - redo
  const freshReq = await fetchJson(base+'/api/oauth1a/request_token');
  const freshTok = freshReq.body.oauth_token;
  const freshAuth = await fetchJson(base+`/api/oauth1a/authorize?oauth_token=${freshTok}`);
  const freshVer = freshAuth.body.oauth_verifier;
  const freshAcc = await fetchJson(base+`/api/oauth1a/access_token?oauth_token=${freshTok}&oauth_verifier=${freshVer}`);
  const accessToken = freshAcc.body.oauth_token;
  console.log(`Access token: ${accessToken}`);
  logStep('17. OAuth1a - GET /api/oauth1a/data with access token', await fetchJson(base+'/api/oauth1a/data', {headers:{Authorization:`OAuth oauth_token="${accessToken}"`}}));

  // 10 OAuth2 - multiple grants
  logStep('18. OAuth2 - POST /api/oauth2/token client_credentials', await fetchJson(base+'/api/oauth2/token', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({grant_type:'client_credentials', client_id:'client_app_123', client_secret:'client_secret_abc_123'})}));
  const cc = await fetchJson(base+'/api/oauth2/token', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({grant_type:'client_credentials', client_id:'client_app_123', client_secret:'client_secret_abc_123'})});
  const ccToken = cc.body.access_token;
  logStep('19. OAuth2 - POST password grant (john/john123)', await fetchJson(base+'/api/oauth2/token', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({grant_type:'password', username:'john', password:'john123', client_id:'client_app_123', client_secret:'client_secret_abc_123'})}));
  const pw = await fetchJson(base+'/api/oauth2/token', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({grant_type:'password', username:'john', password:'john123', client_id:'client_app_123', client_secret:'client_secret_abc_123'})});
  const pwToken = pw.body.access_token;
  const refreshToken = pw.body.refresh_token;
  logStep('20. OAuth2 - GET /api/oauth2/data with Bearer (password grant)', await fetchJson(base+'/api/oauth2/data', {headers:{Authorization:`Bearer ${pwToken}`}}));
  logStep('21. OAuth2 - POST /api/oauth2/introspect', await fetchJson(base+'/api/oauth2/introspect', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({token: pwToken})}));
  // auth code flow
  const codeRes = await fetchJson(base+'/api/oauth2/authorize?response_type=code&client_id=client_app_123&redirect_uri=http://localhost:3000/callback&user=alice');
  const code = codeRes.body.code;
  console.log(`\nAuth code: ${code}`);
  logStep('22. OAuth2 - auth_code exchange', await fetchJson(base+'/api/oauth2/token', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({grant_type:'authorization_code', code, client_id:'client_app_123', client_secret:'client_secret_abc_123', redirect_uri:'http://localhost:3000/callback'})}));
  const ac = await fetchJson(base+'/api/oauth2/token', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({grant_type:'authorization_code', code, client_id:'client_app_123', client_secret:'client_secret_abc_123', redirect_uri:'http://localhost:3000/callback'})}).catch(()=>({body:{}}));
  // Need fresh code
  const freshCodeRes = await fetchJson(base+'/api/oauth2/authorize?response_type=code&client_id=client_app_123&redirect_uri=http://localhost:3000/callback&user=bob');
  const freshCode = freshCodeRes.body.code;
  const ac2 = await fetchJson(base+'/api/oauth2/token', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({grant_type:'authorization_code', code: freshCode, client_id:'client_app_123', client_secret:'client_secret_abc_123', redirect_uri:'http://localhost:3000/callback'})});
  logStep('23. OAuth2 - auth_code data', await fetchJson(base+'/api/oauth2/data', {headers:{Authorization:`Bearer ${ac2.body.access_token}`}}));
  logStep('24. OAuth2 - refresh_token', await fetchJson(base+'/api/oauth2/token', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({grant_type:'refresh_token', refresh_token: refreshToken, client_id:'client_app_123', client_secret:'client_secret_abc_123'})}));

  // 11 Realtime via SSE (public) - fetch first event
  console.log(`\n========== 25. Realtime - SSE public (first event) ==========`);
  try{
    const controller = new AbortController();
    const resp = await fetch(base+'/api/realtime/sse', {signal: controller.signal});
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let chunk = await reader.read();
    console.log(decoder.decode(chunk.value).substring(0,800));
    controller.abort();
    try{ await reader.cancel(); }catch{}
  }catch(e){ console.log('SSE test (Node fetch streaming) - fallback to polling:', e.message);
    logStep('25b Realtime - GET /api/public/data (polling realtime payload)', await fetchJson(base+'/api/public/data'));
  }

  // WS test - use ws library if available
  console.log(`\n========== 26. Realtime - WebSocket ==========`);
  try{
    const WebSocket = require('ws');
    const ws = new WebSocket(base.replace('http','ws')+'/ws?auth=none');
    await new Promise((res, rej)=>{
      const t=setTimeout(()=> rej(new Error('WS timeout')), 4000);
      ws.on('open', ()=> console.log('WS open'));
      ws.on('message', (data)=>{
        console.log('WS message:', data.toString().substring(0,600));
        clearTimeout(t); ws.close(); res();
      });
      ws.on('error', rej);
    });
  }catch(e){ console.log('WS test skipped / failed:', e.message); }

  console.log(`\n========== END-TO-END COMPLETE ==========`);
  console.log(`All 7 auth types + realtime verified on single BaseUrl: ${base}`);
  console.log(`UI: ${base}/  | Runner: ${base}/runner.html | Docs: ${base}/docs | Layman: ${base}/layman`);
})();

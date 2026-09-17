/**
 * OAuth 1.0 (2-legged) - Simplified implementation
 * Flow: Consumer signs requests with HMAC-SHA1 using consumerSecret & tokenSecret
 * No callback/user authorization, just consumer + token
 */
const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const { generateRealtimePayload } = require('../data/realtimeData');

const CONSUMER = { key: 'oauth1_consumer_key', secret: 'oauth1_consumer_secret_123' };
// Pre-issued token for demo
const TOKENS = {
  'oauth1_token_abc': { secret: 'oauth1_token_secret_xyz', consumerKey: CONSUMER.key, user: 'oauth1user' }
};
const nonces = new Set();

function percentEncode(str) { return encodeURIComponent(str).replace(/[!*'()]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase()); }

function verifyOAuth1(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('OAuth ')) return { valid:false, error:'Missing OAuth header' };
  const params = {};
  auth.substring(6).split(',').forEach(p => {
    const m = p.trim().match(/^(\w+)="?(.*?)"?$/);
    if (m) params[percentEncode(m[1])] = m[2].replace(/^"|"$/g,'');
  });
  // Required params
  const required = ['oauth_consumer_key','oauth_token','oauth_signature_method','oauth_timestamp','oauth_nonce','oauth_signature'];
  for (const r of required) if (!params[r]) return { valid:false, error:`Missing ${r}` };
  if (params.oauth_consumer_key !== CONSUMER.key) return { valid:false, error:'Invalid consumer key' };
  if (!TOKENS[params.oauth_token]) return { valid:false, error:'Invalid token' };
  // Replay check
  const nonceKey = params.oauth_nonce + ':' + params.oauth_timestamp;
  if (nonces.has(nonceKey)) return { valid:false, error:'Nonce already used' };
  // Timestamp window 5 min
  if (Math.abs(Date.now()/1000 - parseInt(params.oauth_timestamp)) > 300) return { valid:false, error:'Timestamp out of range' };
  // Verify signature HMAC-SHA1
  const tokenSecret = TOKENS[params.oauth_token].secret;
  const signatureBase = buildSignatureBase(req, params);
  const signingKey = percentEncode(CONSUMER.secret) + '&' + percentEncode(tokenSecret);
  const expectedSig = crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');
  if (expectedSig !== decodeURIComponent(params.oauth_signature)) {
    return { valid:false, error:'Invalid signature', expected: expectedSig, received: decodeURIComponent(params.oauth_signature), base: signatureBase };
  }
  nonces.add(nonceKey);
  setTimeout(()=> nonces.delete(nonceKey), 300*1000);
  return { valid:true, user: TOKENS[params.oauth_token].user };
}

function buildSignatureBase(req, oauthParams) {
  const method = req.method.toUpperCase();
  const baseUrl = `${req.protocol}://${req.get('host')}${req.path}`;
  // Collect all params except oauth_signature
  const all = {};
  // Query params
  for (const [k,v] of Object.entries(req.query)) all[percentEncode(k)] = percentEncode(v);
  // OAuth params except signature
  for (const [k,v] of Object.entries(oauthParams)) if (k !== 'oauth_signature') all[k] = percentEncode(v);
  // Body params if x-www-form-urlencoded
  if (req.body && typeof req.body==='object') for (const [k,v] of Object.entries(req.body)) all[percentEncode(k)] = percentEncode(String(v));
  const sorted = Object.keys(all).sort().map(k => `${k}=${all[k]}`).join('&');
  return `${method}&${percentEncode(baseUrl)}&${percentEncode(sorted)}`;
}

function oauth1Middleware(req,res,next){
  const result = verifyOAuth1(req);
  if (!result.valid) return res.status(401).json({ auth:'oauth1.0', error: result.error, details: result });
  req.user = { username: result.user, auth:'oauth1.0' };
  next();
}

router.get('/credentials', (req,res)=>{
  res.json({
    auth: 'oauth1.0',
    consumer: CONSUMER,
    token: { key:'oauth1_token_abc', secret:'oauth1_token_secret_xyz' },
    signatureMethod: 'HMAC-SHA1',
    exampleHeader: 'Authorization: OAuth oauth_consumer_key="oauth1_consumer_key", oauth_token="oauth1_token_abc", oauth_signature_method="HMAC-SHA1", oauth_timestamp="...", oauth_nonce="...", oauth_signature="..."',
    note: 'Use oauth-1.0a library to sign requests. Server validates HMAC-SHA1.'
  });
});

router.get('/data', oauth1Middleware, (req,res)=>{
  res.json({ auth:'oauth1.0', user:req.user, message:'OAuth 1.0 authenticated (2-legged)', realtime: generateRealtimePayload(), timestamp: new Date().toISOString()});
});
router.get('/realtime', oauth1Middleware, (req,res)=> res.json({ auth:'oauth1.0', realtime: generateRealtimePayload()}));
router.post('/echo', oauth1Middleware, (req,res)=> res.json({ auth:'oauth1.0', echo: req.body, user:req.user }));

module.exports = { router, oauth1Middleware, CONSUMER, TOKENS };

/**
 * Generates Postman Collection v2.1 for all auth types
 */
const fs = require('fs');
const path = require('path');

function buildCollection(){
  let base = 'http://localhost:3000';
  try { base = require('../config').baseUrl || base; } catch {}
  return {
    info: { name: 'Multi-Auth Realtime API', description: 'Postman collection for Non-Auth, Basic, Digest, OAuth1.0, OAuth1.0a, OAuth2.0 + Realtime', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
    variable: [{ key:'baseUrl', value: base }, { key:'wsBaseUrl', value: base.replace('http','ws') }],
    item: [
      {
        name: '1 - Public (No Auth)',
        item: [
          { name:'GET public info', request:{ method:'GET', url:'{{baseUrl}}/api/public/info' } },
          { name:'GET public data', request:{ method:'GET', url:'{{baseUrl}}/api/public/data' } },
          { name:'POST public echo', request:{ method:'POST', header:[{key:'Content-Type', value:'application/json'}], body:{mode:'raw', raw: JSON.stringify({hello:'world'})}, url:'{{baseUrl}}/api/public/echo' } },
          { name:'GET health', request:{ method:'GET', url:'{{baseUrl}}/api/public/health' } },
          { name:'GET SSE public', request:{ method:'GET', url:'{{baseUrl}}/api/realtime/sse' } }
        ]
      },
      {
        name: '2 - Basic Auth',
        item: [
          { name:'GET credentials', request:{ method:'GET', url:'{{baseUrl}}/api/basic/credentials' } },
          { name:'GET basic data (admin)', request:{ method:'GET', auth:{type:'basic', basic:[{key:'username',value:'admin'},{key:'password',value:'admin123'}]}, url:'{{baseUrl}}/api/basic/data' } },
          { name:'GET basic profile', request:{ method:'GET', auth:{type:'basic', basic:[{key:'username',value:'admin'},{key:'password',value:'admin123'}]}, url:'{{baseUrl}}/api/basic/profile' } },
          { name:'GET basic realtime', request:{ method:'GET', auth:{type:'basic', basic:[{key:'username',value:'admin'},{key:'password',value:'admin123'}]}, url:'{{baseUrl}}/api/basic/realtime' } },
          { name:'GET SSE basic', request:{ method:'GET', auth:{type:'basic', basic:[{key:'username',value:'admin'},{key:'password',value:'admin123'}]}, url:'{{baseUrl}}/api/realtime/sse/basic' } }
        ]
      },
      {
        name: '3 - Digest Auth',
        item: [
          { name:'GET credentials', request:{ method:'GET', url:'{{baseUrl}}/api/digest/credentials' } },
          { name:'GET digest data', request:{ method:'GET', auth:{type:'digest', digest:[{key:'username',value:'admin'},{key:'password',value:'admin123'},{key:'algorithm',value:'MD5'},{key:'qop',value:'auth'}]}, url:'{{baseUrl}}/api/digest/data' } }
        ]
      },
      {
        name: '4 - OAuth 1.0 (2-legged HMAC-SHA1)',
        item: [
          { name:'GET credentials', request:{ method:'GET', url:'{{baseUrl}}/api/oauth1/credentials' } },
          { name:'GET oauth1 data (signed)', request:{ method:'GET', auth:{type:'oauth1', oauth1:[{key:'consumerKey',value:'oauth1_consumer_key'},{key:'consumerSecret',value:'oauth1_consumer_secret_123'},{key:'token',value:'oauth1_token_abc'},{key:'tokenSecret',value:'oauth1_token_secret_xyz'},{key:'signatureMethod',value:'HMAC-SHA1'},{key:'version',value:'1.0'}]}, url:'{{baseUrl}}/api/oauth1/data' } }
        ]
      },
      {
        name: '5 - OAuth 1.0a (3-legged)',
        item: [
          { name:'POST request_token', request:{ method:'POST', url:'{{baseUrl}}/api/oauth1a/request_token' } },
          { name:'GET request_token', request:{ method:'GET', url:'{{baseUrl}}/api/oauth1a/request_token' } },
          { name:'GET authorize', request:{ method:'GET', url:{raw:'{{baseUrl}}/api/oauth1a/authorize?oauth_token={{oauth1a_request_token}}', query:[{key:'oauth_token', value:'{{oauth1a_request_token}}'}]} } },
          { name:'POST access_token', request:{ method:'POST', header:[{key:'Content-Type', value:'application/json'}], body:{mode:'raw', raw: JSON.stringify({oauth_token:'{{oauth1a_request_token}}', oauth_verifier:'{{oauth1a_verifier}}'})}, url:'{{baseUrl}}/api/oauth1a/access_token' } },
          { name:'GET oauth1a data', request:{ method:'GET', header:[{key:'Authorization', value:'OAuth oauth_token="{{oauth1a_access_token}}"'}], url:'{{baseUrl}}/api/oauth1a/data' } }
        ]
      },
      {
        name: '6 - OAuth 2.0',
        item: [
          { name:'GET credentials', request:{ method:'GET', url:'{{baseUrl}}/api/oauth2/credentials' } },
          { name:'GET authorize code', request:{ method:'GET', url:{raw:'{{baseUrl}}/api/oauth2/authorize?response_type=code&client_id=client_app_123&redirect_uri=http://localhost:3000/callback&user=john', query:[{key:'response_type',value:'code'},{key:'client_id',value:'client_app_123'},{key:'redirect_uri',value:'http://localhost:3000/callback'},{key:'user',value:'john'}]} } },
          { name:'POST token - auth_code', request:{ method:'POST', header:[{key:'Content-Type', value:'application/json'}], body:{mode:'raw', raw: JSON.stringify({grant_type:'authorization_code', code:'{{oauth2_code}}', client_id:'client_app_123', client_secret:'client_secret_abc_123', redirect_uri:'http://localhost:3000/callback'})}, url:'{{baseUrl}}/api/oauth2/token' } },
          { name:'POST token - client_credentials', request:{ method:'POST', header:[{key:'Content-Type', value:'application/json'}], body:{mode:'raw', raw: JSON.stringify({grant_type:'client_credentials', client_id:'client_app_123', client_secret:'client_secret_abc_123'})}, url:'{{baseUrl}}/api/oauth2/token' } },
          { name:'POST token - password', request:{ method:'POST', header:[{key:'Content-Type', value:'application/json'}], body:{mode:'raw', raw: JSON.stringify({grant_type:'password', username:'john', password:'john123', client_id:'client_app_123', client_secret:'client_secret_abc_123'})}, url:'{{baseUrl}}/api/oauth2/token' } },
          { name:'POST token - refresh', request:{ method:'POST', header:[{key:'Content-Type', value:'application/json'}], body:{mode:'raw', raw: JSON.stringify({grant_type:'refresh_token', refresh_token:'{{oauth2_refresh_token}}', client_id:'client_app_123', client_secret:'client_secret_abc_123'})}, url:'{{baseUrl}}/api/oauth2/token' } },
          { name:'POST introspect', request:{ method:'POST', header:[{key:'Content-Type', value:'application/json'}], body:{mode:'raw', raw: JSON.stringify({token:'{{oauth2_access_token}}'})}, url:'{{baseUrl}}/api/oauth2/introspect' } },
          { name:'GET oauth2 data', request:{ method:'GET', auth:{type:'bearer', bearer:[{key:'token', value:'{{oauth2_access_token}}'}]}, url:'{{baseUrl}}/api/oauth2/data' } },
          { name:'GET SSE oauth2', request:{ method:'GET', auth:{type:'bearer', bearer:[{key:'token', value:'{{oauth2_access_token}}'}]}, url:'{{baseUrl}}/api/realtime/sse/oauth2' } }
        ]
      },
      {
        name: '7 - Generic OAuth',
        item: [
          { name:'GET generic info', request:{ method:'GET', url:'{{baseUrl}}/api/oauth/info' } }
        ]
      },
      {
        name: 'Realtime - WebSocket & Socket.IO',
        item: [
          { name:'WebSocket public {{wsBaseUrl}}/ws', request:{ method:'GET', url:'{{wsBaseUrl}}/ws?auth=none' } },
          { name:'WebSocket oauth2 {{wsBaseUrl}}/ws?token=JWT', request:{ method:'GET', url:'{{wsBaseUrl}}/ws?token={{oauth2_access_token}}&auth=oauth2' } },
          { name:'Socket.IO', request:{ method:'GET', url:'{{baseUrl}}/socket.io/?EIO=4&transport=polling' } }
        ]
      }
    ],
    event: [{listen:'prerequest', script:{type:'text/javascript', exec:['']}}]
  };
}

function generatePostman(outputPath){
  const col = buildCollection();
  fs.writeFileSync(outputPath, JSON.stringify(col,null,2));
  // also per-auth splits
  const dir = path.dirname(outputPath);
  for (const folder of col.item){
    const single = { info:{...col.info, name: folder.name }, item:[folder], variable: col.variable };
    const safe = folder.name.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
    fs.writeFileSync(path.join(dir, `postman.${safe}.json`), JSON.stringify(single,null,2));
  }
  return col;
}

module.exports = { buildCollection, generatePostman };

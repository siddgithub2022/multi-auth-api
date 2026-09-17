/**
 * Generates Swagger/OpenAPI JSON for each auth type and combined
 */
const fs = require('fs');
const path = require('path');

function baseSpec() {
  let baseUrl = 'http://localhost:3000';
  try { baseUrl = require('../config').baseUrl || baseUrl; } catch {}
  return {
    openapi: '3.0.3',
    info: { title: 'Multi-Auth Realtime API', version: '1.0.0', description: 'Demonstrates Non-Auth, Basic, Digest, OAuth 1.0, OAuth 1.0a, OAuth 2.0 with realtime (WS, SSE, Socket.IO) - Single BaseUrl for all auth types' },
    servers: [{ url: baseUrl, description: 'Single BaseUrl for all auth types - Dedicated Server' }],
    tags: [
      { name: 'Public (No Auth)', description: 'No authentication' },
      { name: 'Basic Auth', description: 'HTTP Basic' },
      { name: 'Digest Auth', description: 'HTTP Digest RFC7616' },
      { name: 'OAuth 1.0', description: 'OAuth 1.0 2-legged HMAC-SHA1' },
      { name: 'OAuth 1.0a', description: 'OAuth 1.0a 3-legged' },
      { name: 'OAuth 2.0', description: 'OAuth 2.0 Bearer (auth code, client_credentials, password, refresh)' },
      { name: 'Realtime', description: 'WebSocket, SSE, Socket.IO' },
      { name: 'Generic OAuth', description: 'Generic OAuth wrapper' }
    ],
    components: {
      securitySchemes: {
        basicAuth: { type: 'http', scheme: 'basic' },
        digestAuth: { type: 'http', scheme: 'digest' },
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        oauth1: { type: 'oauth2', flows: {} },
        oauth2: {
          type: 'oauth2',
          flows: {
            authorizationCode: { authorizationUrl: (function(){ try{ return require('../config').baseUrl+'/api/oauth2/authorize'}catch{ return 'http://localhost:3000/api/oauth2/authorize'}})(), tokenUrl: (function(){ try{ return require('../config').baseUrl+'/api/oauth2/token'}catch{ return 'http://localhost:3000/api/oauth2/token'}})(), scopes: { read: 'read', write: 'write' } },
            clientCredentials: { tokenUrl: (function(){ try{ return require('../config').baseUrl+'/api/oauth2/token'}catch{ return 'http://localhost:3000/api/oauth2/token'}})(), scopes: { read: 'read' } },
            password: { tokenUrl: (function(){ try{ return require('../config').baseUrl+'/api/oauth2/token'}catch{ return 'http://localhost:3000/api/oauth2/token'}})(), scopes: { read: 'read', write: 'write' } }
          }
        }
      },
      schemas: {
        RealtimePayload: { type: 'object', properties: { timestamp:{type:'string'}, stocks:{type:'array'}, crypto:{type:'array'}, sensors:{type:'object'}, metrics:{type:'object'} } },
        Error: { type:'object', properties:{ error:{type:'string'}, message:{type:'string'} } }
      }
    },
    paths: {}
  };
}

function addPaths(spec){
  spec.paths['/api/public/info'] = { get: { tags:['Public (No Auth)'], summary:'Public info (no auth)', responses:{ '200':{description:'OK'}} } };
  spec.paths['/api/public/data'] = { get: { tags:['Public (No Auth)'], summary:'Public data', responses:{ '200':{description:'OK'}} } };
  spec.paths['/api/public/echo'] = { post: { tags:['Public (No Auth)'], summary:'Echo public', requestBody:{content:{'application/json':{schema:{type:'object'}}}}, responses:{'200':{description:'OK'}} } };

  spec.paths['/api/basic/data'] = { get: { tags:['Basic Auth'], summary:'Basic Auth data', security:[{basicAuth:[]}], responses:{ '200':{description:'OK'}, '401':{description:'Unauthorized'}} } };
  spec.paths['/api/basic/profile'] = { get: { tags:['Basic Auth'], summary:'Basic profile', security:[{basicAuth:[]}], responses:{'200':{description:'OK'}} } };
  spec.paths['/api/digest/data'] = { get: { tags:['Digest Auth'], summary:'Digest data', security:[{digestAuth:[]}], responses:{'200':{description:'OK'}} } };
  spec.paths['/api/oauth1/data'] = { get: { tags:['OAuth 1.0'], summary:'OAuth 1.0 data', security:[{oauth1:[]}], parameters:[{name:'Authorization', in:'header', description:'OAuth header with HMAC-SHA1 signature', required:true, schema:{type:'string'}}], responses:{'200':{description:'OK'}} } };

  spec.paths['/api/oauth1a/request_token'] = { post:{tags:['OAuth 1.0a'], summary:'Get request token', responses:{'200':{description:'token'}}}, get:{tags:['OAuth 1.0a'], summary:'Get request token (GET)', responses:{'200':{description:'token'}}} };
  spec.paths['/api/oauth1a/authorize'] = { get:{tags:['OAuth 1.0a'], summary:'Authorize request token', parameters:[{name:'oauth_token', in:'query', required:true, schema:{type:'string'}}], responses:{'200':{description:'verifier'}} } };
  spec.paths['/api/oauth1a/access_token'] = { post:{tags:['OAuth 1.0a'], summary:'Exchange for access token', requestBody:{content:{'application/x-www-form-urlencoded':{schema:{type:'object', properties:{oauth_token:{type:'string'}, oauth_verifier:{type:'string'}}}}}}, responses:{'200':{description:'access token'}} } };
  spec.paths['/api/oauth1a/data'] = { get:{tags:['OAuth 1.0a'], summary:'OAuth1a data (needs access token)', security:[{oauth1:[]}], responses:{'200':{description:'OK'}}} };

  spec.paths['/api/oauth2/authorize'] = {
    get: {
      tags:['OAuth 2.0'],
      summary:'Authorization endpoint',
      parameters:[
        {name:'response_type',in:'query',required:true,schema:{type:'string', enum:['code']}},
        {name:'client_id',in:'query',required:true,schema:{type:'string'}},
        {name:'redirect_uri',in:'query',schema:{type:'string'}},
        {name:'user',in:'query',schema:{type:'string'}}
      ],
      responses:{'200':{description:'code'}}
    }
  };

  spec.paths['/api/oauth2/token'] = {
    post: {
      tags:['OAuth 2.0'],
      summary:'Token endpoint',
      requestBody:{
        content:{
          'application/json':{
            schema:{
              type:'object',
              properties:{
                grant_type:{type:'string', enum:['authorization_code','client_credentials','password','refresh_token']},
                code:{type:'string'},
                client_id:{type:'string'},
                client_secret:{type:'string'},
                username:{type:'string'},
                password:{type:'string'},
                refresh_token:{type:'string'}
              }
            }
          }
        }
      },
      responses:{'200':{description:'token'}}
    }
  };

  spec.paths['/api/oauth2/data'] = { get:{tags:['OAuth 2.0'], summary:'OAuth2 protected data', security:[{bearerAuth:[]}], responses:{'200':{description:'OK'}}} };
  spec.paths['/api/oauth2/introspect'] = { post:{tags:['OAuth 2.0'], summary:'Introspect token', requestBody:{content:{'application/json':{schema:{type:'object', properties:{token:{type:'string'}}}}}}, responses:{'200':{description:'OK'}}} };

  spec.paths['/api/realtime/sse'] = { get:{tags:['Realtime'], summary:'SSE public stream', responses:{'200':{description:'event stream', content:{'text/event-stream':{schema:{type:'string'}}}}}} };
  spec.paths['/api/realtime/sse/oauth2'] = { get:{tags:['Realtime'], summary:'SSE OAuth2 stream', security:[{bearerAuth:[]}], responses:{'200':{description:'stream'}}} };
  spec.paths['/api/realtime/sse/basic'] = { get:{tags:['Realtime'], summary:'SSE Basic stream', security:[{basicAuth:[]}], responses:{'200':{description:'stream'}}} };
  spec.paths['/ws'] = { get:{tags:['Realtime'], summary:'WebSocket (upgrade)', description:(function(){ try{ return require('../config').wsBaseUrl+'/ws?token=JWT&auth=oauth2'}catch{ return 'ws://localhost:3000/ws?token=JWT&auth=oauth2'}})(), responses:{'101':{description:'Switching protocols'}}} };
  spec.paths['/socket.io/'] = { get:{tags:['Realtime'], summary:'Socket.IO', responses:{'200':{description:'OK'}}} };

  return spec;
}

function generateAll(outputDir){
  const full = addPaths(baseSpec());
  // Try to write to disk, but gracefully handle read-only (Vercel /var/task)
  try {
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, {recursive:true});
    fs.writeFileSync(path.join(outputDir,'swagger.json'), JSON.stringify(full,null,2));
    const tagsMap = {
      'noauth': ['Public (No Auth)'],
      'basic': ['Basic Auth'],
      'digest': ['Digest Auth'],
      'oauth1': ['OAuth 1.0'],
      'oauth1a': ['OAuth 1.0a'],
      'oauth2': ['OAuth 2.0'],
      'realtime': ['Realtime']
    };
    for (const [key, tags] of Object.entries(tagsMap)){
      const clone = JSON.parse(JSON.stringify(full));
      clone.info.title = `Multi-Auth API - ${key}`;
      clone.paths = Object.fromEntries(Object.entries(full.paths).filter(([_,v])=>{
        const method = Object.values(v)[0];
        return method.tags && method.tags.some(t=> tags.includes(t));
      }));
      clone.tags = full.tags.filter(t=> tags.includes(t.name));
      fs.writeFileSync(path.join(outputDir,`swagger.${key}.json`), JSON.stringify(clone,null,2));
    }
  } catch(e) {
    // On Vercel read-only file system, just return in-memory (no file write)
    if(e.code !== 'EROFS' && !String(e.message).includes('read-only')) throw e;
    // Silently ignore, return full spec
  }
  return full;
}

module.exports = { generateAll, baseSpec, addPaths };

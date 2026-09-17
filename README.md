# Multi-Auth Realtime API • Dedicated Server + Tabbed UI

> **New to APIs?** Start here → **[LAYMAN_GUIDE.md](LAYMAN_GUIDE.md)** — plain English, no coding needed. Also available at `http://localhost:3000/layman` when server is running.

Complete API demonstrating **7 authentication types** with realtime data and a dedicated Node.js server.

## Auth Types Covered
| Tab | Type | Endpoint Prefix | Auth Details |
|-----|------|-----------------|--------------|
| 1 | **Non-Auth (Public)** | `/api/public/*` | No auth required |
| 2 | **Basic** | `/api/basic/*` | `Authorization: Basic base64(user:pass)` |
| 3 | **Digest** | `/api/digest/*` | RFC 7616 MD5 nonce/qop |
| 4 | **OAuth** (generic) | `/api/oauth/*` | Wrapper for OAuth |
| 5 | **OAuth 1.0** (2-legged) | `/api/oauth1/*` | HMAC-SHA1 signed requests |
| 6 | **OAuth 1.0a** (3-legged) | `/api/oauth1a/*` | request_token → authorize → access_token |
| 7 | **OAuth 2.0** | `/api/oauth2/*` | Bearer JWT, grants: `authorization_code`, `client_credentials`, `password`, `refresh_token` |

**Realtime**: WebSocket (`ws://localhost:3000/ws`), SSE (`/api/realtime/sse`), Socket.IO (`/socket.io`)

---

## Structure
```
/
├── server/
│   ├── server.js              # Dedicated Express server
│   ├── config/index.js        # Secrets, clients, users
│   ├── auth/
│   │   ├── noAuth.js
│   │   ├── basicAuth.js
│   │   ├── digestAuth.js
│   │   ├── oauth1.js
│   │   ├── oauth1a.js
│   │   ├── oauth2.js
│   │   └── oauth.js
│   ├── realtime/websocket.js  # WS, Socket.IO, SSE setup
│   ├── data/realtimeData.js   # Live payload generator
│   ├── utils/swaggerGenerator.js
│   ├── utils/postmanGenerator.js
│   ├── middleware/logger.js
│   └── .env
├── client/
│   ├── index.html             # Tabbed UI (7 tabs)
│   ├── css/style.css
│   └── js/app.js
├── swagger/
│   ├── swagger.json           # Combined OpenAPI 3.0
│   ├── swagger.noauth.json
│   ├── swagger.basic.json
│   ├── swagger.digest.json
│   ├── swagger.oauth1.json
│   ├── swagger.oauth1a.json
│   ├── swagger.oauth2.json
│   └── swagger.realtime.json
├── docs/
│   ├── swagger.json + per-auth
│   ├── postman_collection.json        # Full collection
│   └── postman.*.json                 # Per-tab collections
└── package.json
```

---

## Quick Start

```powershell
cd "E:\Basic API Creation\server"
npm install
npm start
# open http://localhost:3000
```

UI auto-served at `http://localhost:3000` with tabs for each auth.

### Verify
```powershell
curl http://localhost:3000/health
curl http://localhost:3000/api/public/info
curl -u admin:admin123 http://localhost:3000/api/basic/data
curl --digest -u admin:admin123 http://localhost:3000/api/digest/data
```

---

## Swagger / OpenAPI
- Combined: `GET /swagger.json` or `GET /api/swagger.json` → `swagger/swagger.json`
- Per-auth:
  - `/swagger.noauth.json` → Public
  - `/swagger.basic.json`
  - `/swagger.digest.json`
  - `/swagger.oauth1.json`
  - `/swagger.oauth1a.json`
  - `/swagger.oauth2.json`
  - `/swagger.realtime.json`
- UI: `GET /docs` (Swagger UI via CDN)
- Files also in `swagger/` and `docs/` folders.

Regenerate:
```powershell
node -e "require('./server/utils/swaggerGenerator').generateAll('./swagger')"
```

## Postman Collections
- Combined: `GET /postman.json` → `docs/postman_collection.json`
- Per-tab: `docs/postman.*.json`
  - `postman.1_public_no_auth.json`
  - `postman.2_basic_auth.json`
  - `postman.3_digest_auth.json`
  - `postman.4_oauth_1_0_2_legged_hmac_sha1.json`
  - `postman.5_oauth_1_0a_3_legged.json`
  - `postman.6_oauth_2_0.json`
  - `postman.7_generic_oauth.json`
  - `postman.realtime_websocket_socket_io.json`
- Import `docs/postman_collection.json` into Postman.

Regenerate:
```powershell
node -e "require('./server/utils/postmanGenerator').generatePostman('./docs/postman_collection.json')"
```

---

## Auth Examples

### Basic
```http
GET /api/basic/data
Authorization: Basic YWRtaW46YWRtaW4xMjM=
# admin:admin123, user1:password123, demo:demo123
```

### Digest
```powershell
curl --digest -u admin:admin123 http://localhost:3000/api/digest/data
# Users: admin/admin123, digestuser/digestpass
```

### OAuth 1.0 (HMAC-SHA1)
- Consumer: `oauth1_consumer_key` / `oauth1_consumer_secret_123`
- Token: `oauth1_token_abc` / `oauth1_token_secret_xyz`
- Sign with `HMAC-SHA1`, include `Authorization: OAuth ...`

### OAuth 1.0a 3-legged
```http
POST /api/oauth1a/request_token
GET /api/oauth1a/authorize?oauth_token=...
POST /api/oauth1a/access_token {oauth_token, oauth_verifier}
GET /api/oauth1a/data  Header: OAuth oauth_token="..."
```

### OAuth 2.0
```http
# Client Credentials
POST /api/oauth2/token
{ "grant_type":"client_credentials", "client_id":"client_app_123", "client_secret":"client_secret_abc_123" }

# Password
POST /api/oauth2/token
{ "grant_type":"password", "username":"john", "password":"john123", "client_id":"client_app_123", "client_secret":"client_secret_abc_123" }

# Authorization Code
GET /api/oauth2/authorize?response_type=code&client_id=client_app_123&redirect_uri=http://localhost:3000/callback&user=john
POST /api/oauth2/token { "grant_type":"authorization_code", "code":"...", "client_id":"...", "client_secret":"...", "redirect_uri":"..." }

# Use Bearer
GET /api/oauth2/data
Authorization: Bearer <jwt>
```

---

## Realtime Endpoints
- **Polling**: `GET /api/public/data` returns live `realtime` payload every request
- **SSE Public**: `GET /api/realtime/sse` (EventSource)
- **SSE Bearer**: `GET /api/realtime/sse/oauth2` (Bearer) / `GET /api/realtime/sse/basic` (Basic)
- **WebSocket**: `ws://localhost:3000/ws?token=JWT&auth=oauth2` or `ws://localhost:3000/realtime`
- **Socket.IO**: `io("http://localhost:3000", {auth:{token}})` events: `connected`, `realtime`

Payload example:
```json
{
  "stocks": [{"symbol":"AAPL","price":"182.33"}],
  "crypto": [{"symbol":"BTC","price":"64231"}],
  "sensors": {"temperature":"24.3","cpu":"67.2"},
  "metrics": {"requestsPerSec":842}
}
```

---

## Dedicated Server
- Single Express app serves API + static UI + Swagger + Postman + Realtime
- Middleware per auth isolated in `server/auth/*`
- Rate limiting, Helmet, CORS enabled
- Live data tick every 2s via `data/realtimeData.js`

---

## Environment
Copy `server/.env.example` to `server/.env` and set `JWT_SECRET`, `SESSION_SECRET`.

---

Generated by Muse Spark — file paths in logs use `file_path:line` style.

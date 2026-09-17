# Free Domain + Free Hosting for Multi-Auth API (no payment)

Your `http://192.168.0.45:3000` and `http://localhost:3000` are LAN only. C2M cloud needs **public `https://your-name.free-domain`** — tunnel `lhr.life` is temporary (new random URL each run → `no tunnel here` if closed). Below are **100% free, permanent** options — pick one.

---

## Option A — Fastest (2 min, no domain purchase) — Render Free Subdomain

You already have `Dockerfile:1` + `docker-compose.yml:1` — Render gives `https://your-app.onrender.com` free forever.

1. Push `E:\Basic API Creation` to GitHub (create repo `multi-auth-api` → `git add .` → `git commit -m init` → `git push`)
2. Go to https://dashboard.render.com → **New +** → **Web Service** → Connect GitHub repo
3. Settings:
   - **Build Command:** `npm install && cd server && npm install && cd ../client && npm install`
   - **Start Command:** `node server/server.js`
   - **Env:** `PORT=3000`, `BASE_URL=https://your-app.onrender.com`, `HOST=0.0.0.0`
4. **Create Web Service** → wait 2 min → `https://your-app.onrender.com/health` → `200`
5. Use in C2M: `https://your-app.onrender.com/api/public/info` (permanent, no window to keep open)

Free: 750h/month, sleeps after 15 min idle — wakes on next C2M call (add `https://your-app.onrender.com/health` to uptime robot to keep warm).

---

## Option B — Fly.io Free (global)

```powershell
npm install -g flyctl
fly auth signup   # free, no card for hobby
fly launch --name your-multi-auth --region bom --no-deploy
# edit fly.toml: internal_port = 3000
fly deploy
# → https://your-multi-auth.fly.dev
flyctl certs create your-multi-auth.fly.dev # auto https
```
Env: `fly secrets set BASE_URL=https://your-multi-auth.fly.dev`

---

## Option C — Railway Free

1. https://railway.app → **New Project** → **Deploy from GitHub**
2. Add **Variables:** `PORT=3000`, `BASE_URL=https://${{RAILWAY_STATIC_URL}}`
3. Deploy → `https://your-app.up.railway.app`

---

## Option D — Vercel (serverless, free)

Vercel gives `https://your-app.vercel.app` free. Need `vercel.json` (already works as Node):

```json
{ "version": 2, "builds": [{"src": "server/server.js", "use": "@vercel/node"}], "routes": [{"src": "/(.*)", "dest": "server/server.js"}] }
```
Deploy: `npm i -g vercel` → `vercel` → link → `https://...vercel.app`

---

## Option E — Free Domain (custom) + Free Hosting

If you want **your own** free domain like `yourname.tk`:

**Free Domain Providers:**
- **Freenom** - `tk, ml, ga, cf, gq` free 12 months: https://www.freenom.com
- **is-a.dev** - free `yourname.is-a.dev` for devs (permanent): https://is-a.dev → PR to `https://github.com/is-a-dev/register`
- **Afraid.org** - free subdomain: https://freedns.afraid.org
- **DuckDNS** - `yourname.duckdns.org`: https://www.duckdns.org
- **No-IP** - free `yourname.ddns.net`

**Then point to free hosting (Render/Fly):**
- Freenom → **Manage Domain → Management Tools → Nameservers → Use default** → **Manage Fwd → URL Forwarding** or **DNS → A/CNAME → CNAME to `your-app.onrender.com`**
- Cloudflare (free) → Add domain → DNS → `CNAME yourname → your-app.onrender.com` → **SSL Full**

**Best combo for C2M:** `is-a.dev` + `Render` — permanent, no renewal, looks professional in C2M.

---

## For C2M Connector — Use Permanent Free Domain

Once you have `https://your-app.onrender.com` (or `https://yourname.lhr.life` with free localhost.run account):

- **Host in C2M:** `https://your-app.onrender.com` (no port, `https`)
- **Endpoints:**
  - Public: `GET https://your-app.onrender.com/api/public/info`
  - Basic: `GET https://your-app.onrender.com/api/basic/data` + Header `Authorization: Basic YWRtaW46YWRtaW4xMjM=`
  - Digest: `GET https://your-app.onrender.com/api/digest/data` (auto 401 → MD5)
  - OAuth2: `POST https://your-app.onrender.com/api/oauth2/token` → `GET https://your-app.onrender.com/api/oauth2/data` Header `Authorization: Bearer <token>`

Test in browser first: `https://your-app.onrender.com/api/public/info` → `200` then paste same into C2M **Send** → `200` not `500`.

---

## Current Temporary (keep window open)

`expose-free.bat` → `https://xxxx.lhr.life` is free but **random each run** — good for testing, not for C2M permanent. For C2M permanent use **Render** etc. above — **one-time 2 min setup, forever free**.

Want me to push to GitHub + deploy to Render for you? Give GitHub repo name.

# PulsePM — Production & Staging Deployment Blueprint

This guide covers deploying **PulsePM** with separate **Staging** and **Production** environments across **Vercel** (Frontend), **Render / Railway** (Backend + WebSockets), **MongoDB Atlas**, **Upstash Redis**, **Cloudinary**, and **Sentry**.

---

## 1. Environment Separation Strategy

| Resource | Staging | Production |
| :--- | :--- | :--- |
| **Frontend (Vercel)** | `pulsepm-staging.vercel.app` (preview/staging branch) | `pulsepm.vercel.app` (main branch) |
| **Backend (Render/Railway)** | `pulsepm-api-staging.onrender.com` | `pulsepm-api.onrender.com` |
| **MongoDB Atlas** | Separate database `/pulsepm_staging` | Separate database `/pulsepm_prod` |
| **JWT_SECRET** | Unique 64-char random secret | Different 64-char random secret |
| **Upstash Redis** | Staging Redis DB | Production Redis DB |

---

## 2. Third-Party Services Setup (What to Click & Where to Paste)

### A. MongoDB Atlas
1. Log into [MongoDB Atlas](https://cloud.mongodb.com) → **Database** → **Create** (M0 Free or Dedicated).
2. Under **Security → Database Access**: create separate users for staging and production with **Read and write to any database**.
3. Under **Security → Network Access**: add `0.0.0.0/0` (for Render/Railway dynamic egress IPs).
4. Click **Connect → Drivers → Node.js** and copy the `mongodb+srv://...` URI.
   - Staging `MONGO_URI`: `mongodb+srv://user:pass@cluster.mongodb.net/pulsepm_staging?retryWrites=true&w=majority`
   - Production `MONGO_URI`: `mongodb+srv://user:pass@cluster.mongodb.net/pulsepm_prod?retryWrites=true&w=majority`

### B. Upstash Redis (Socket.io Adapter & Report Caching)
1. Log into [Upstash Console](https://console.upstash.com) → **Redis → Create Database**.
2. Copy the **TLS Redis URL** (`rediss://default:<password>@<host>.upstash.io:6379`).
3. Paste into backend `REDIS_URL`.
   - Note: `server/src/sockets/index.js` automatically attaches `@socket.io/redis-adapter` when `REDIS_URL` is set, enabling multi-instance WebSocket sync.

### C. Cloudinary (Task Attachments)
1. Log into [Cloudinary](https://cloudinary.com) → **Dashboard**.
2. Copy **Cloud Name**, **API Key**, and **API Secret**.
3. Paste into backend: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

### D. Google Gmail API (OAuth2 over HTTPS for Invitations)
Render's free tier blocks outbound SMTP ports (`25`, `465`, `587`), so production invitation emails use the **Gmail API over HTTPS (`port 443`)**:
1. In [Google Cloud Console](https://console.cloud.google.com):
   - Create/select a project → **APIs & Services → Library** → enable **Gmail API**.
   - Go to **Google Auth Platform / OAuth consent screen** → choose **External** → add scope `https://www.googleapis.com/auth/gmail.send`.
   - Go to **Clients → Create OAuth client ID** (Web application, redirect URI `https://developers.google.com/oauthplayground`).
   - Use [OAuth 2.0 Playground](https://developers.google.com/oauthplayground) (with your own Client ID & Secret in Settings) to authorize `https://www.googleapis.com/auth/gmail.send` and exchange for a **Refresh Token**.
2. Set in Render **Environment**:
   - `GMAIL_CLIENT_ID=<your-oauth-client-id>`
   - `GMAIL_CLIENT_SECRET=<your-oauth-client-secret>`
   - `GMAIL_REFRESH_TOKEN=<your-oauth-refresh-token>`
   - `GMAIL_USER=<your-gmail-address>`
3. **Google OAuth Production Considerations**:
   - **Testing mode 7-day expiry**: While an External OAuth app's Publishing Status is **Testing**, Google expires issued refresh tokens after **7 days** (requiring re-authorization or publishing).
   - **Production publishing & verification**: Publishing the app to **In Production** removes the 7-day Testing-mode cap, though `gmail.send` is a **restricted/sensitive scope** — Google displays an "Unverified app" warning (and caps unverified user grants) unless the app completes **Google OAuth verification** (and CASA security assessment if required for restricted scopes). Note that even in Production, refresh tokens can still be revoked by the user, password change, or Google security policies (not guaranteed permanent).

### E. Sentry (Error Tracking & 5xx Alerting)
1. Log into [Sentry](https://sentry.io) → **Projects → Create Project**:
   - Create a **Node.js / Express** project → copy DSN → paste into backend `SENTRY_DSN`.
   - Create a **React** project → copy DSN → paste into frontend `VITE_SENTRY_DSN`.
2. **Configure 5xx Spike Alert Rule**:
   - Go to **Alerts → Create Alert → Issues / Metric Alert**.
   - Filter: `http.status_code >= 500` (or `level:error`).
   - Condition: **Number of errors is above 5 in 5 minutes** → Notify via Email / Slack.

---

## 3. Backend Deployment (Render or Railway)

1. Connect GitHub repo `mauligarg/PulsePM` in **Render → New Web Service** (or Railway).
2. Set **Root Directory**: `server`
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `npm start`
5. Add Environment Variables:
   ```env
   NODE_ENV=production
   PORT=5000
   MONGO_URI=<your-atlas-prod-uri>
   JWT_SECRET=<your-64-char-prod-secret>
   JWT_EXPIRES_IN=7d
   CLIENT_URL=https://your-app.vercel.app
   REDIS_URL=<your-upstash-rediss-url>
   CLOUDINARY_CLOUD_NAME=<cloud-name>
   CLOUDINARY_API_KEY=<api-key>
   CLOUDINARY_API_SECRET=<api-secret>
   GMAIL_CLIENT_ID=<oauth-client-id>
   GMAIL_CLIENT_SECRET=<oauth-client-secret>
   GMAIL_REFRESH_TOKEN=<oauth-refresh-token>
   GMAIL_USER=<your-gmail-address>
   LOG_LEVEL=info
   SENTRY_DSN=<server-sentry-dsn>
   ```
6. **WebSockets & CORS**:
   - Render and Railway support WebSockets natively over `wss://` on port 443.
   - Ensure `CLIENT_URL` matches your exact Vercel origin (no trailing slash) so Express CORS and Socket.io `cors.origin` allow credentials.

---

## 4. Frontend Deployment (Vercel)

1. Import `mauligarg/PulsePM` in **Vercel → Add New Project**.
2. Set **Root Directory**: `client`
3. **Framework Preset**: `Vite` (`npm run build`, output `dist`)
4. Add Environment Variables:
   ```env
   VITE_API_URL=https://your-backend.onrender.com/api
   VITE_SOCKET_URL=https://your-backend.onrender.com
   VITE_SENTRY_DSN=<client-sentry-dsn>
   ```
5. Deploy! Add `client/vercel.json` SPA rewrite if deep-linking routes like `/invites/accept`:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```

---

## 5. Post-Deploy Verification Checklist

1. **Health & Request ID Check**:
   - Visit `https://your-backend.onrender.com/api/health` → expect `200 OK` and `X-Request-Id` response header.
2. **Live Multi-Tenant Isolation Test**:
   ```bash
   BASE_URL=https://your-backend.onrender.com npm --prefix server run test:isolation
   ```
   - Verifies two separate accounts & workspaces on the live URL cannot read, update, or tamper with each other's data.
3. **Two-Device Real-Time Sync Check**:
   - Log into the same workspace on **two different devices/browsers** at `https://your-app.vercel.app`.
   - Drag a task card on Device A → confirm it moves instantaneously on Device B without refreshing.
   - Post `@teammate` in a comment on Device A → confirm Device B's notification bell increments in real time.

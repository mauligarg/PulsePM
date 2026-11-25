# PulsePM — Multi-Tenant Project Management SaaS (BEE-II Evaluation Milestone)

A full-stack, enterprise-grade **Jira/Asana-style Project Management SaaS** engineered with strict **multi-tenant workspace isolation**, **Role-Based Access Control (RBAC)**, **real-time collaborative Kanban boards**, and **dynamic analytics dashboards**.

---

## 1. System Architecture

```
                                  [ Web Client: React 18 + Vite + TS ]
                                  (Tailwind CSS + Zustand + @dnd-kit)
                                                  │
                                  REST Requests   │  WebSockets (Socket.io)
                                (JWT in Auth Hdr) │  Room: ws:<workspaceId>
                                                  ▼
                        ┌───────────────────────────────────────────────────┐
                        │              Node.js + Express Server             │
                        ├───────────────────────────────────────────────────┤
                        │  1. Authenticate Middleware (verify JWT)          │
                        │  2. ResolveTenant Middleware (AsyncLocalStorage)  │
                        │  3. RBAC Authorize Middleware (permissions.js)   │
                        │  4. Validation Middleware (express-validator)     │
                        └─────────────────────────┬─────────────────────────┘
                                                  │
                                  Mongoose Driver │ with TenantGuard Plugin
                                                  ▼
                        ┌───────────────────────────────────────────────────┐
                        │                  MongoDB Database                 │
                        │    (Atlas Cloud OR In-Memory Zero-Config Engine)  │
                        ├───────────────────────────────────────────────────┤
                        │  - Workspaces       - Projects (tenant-scoped)    │
                        │  - Users            - Tasks    (tenant-scoped)    │
                        │  - Memberships      - Comments (tenant-scoped)    │
                        │  - Invites (SHA256) - Activity (tenant-scoped)    │
                        └───────────────────────────────────────────────────┘
```

---

## 2. Multi-Tenant Safety & The `tenantGuard` Plugin

### Why `workspaceId` is NEVER trusted from request body or query params
In a multi-tenant application, allowing the client to supply `?workspaceId=...` or `{ workspaceId: "..." }` in the request body is a catastrophic security vulnerability (Insecure Direct Object Reference / IDOR).
1. When a user logs in or switches workspace, the server issues a cryptographically signed JWT containing `{ userId, workspaceId, role }`.
2. The `resolveTenant` middleware reads `workspaceId` **strictly from the verified JWT claims**.
3. It sets the execution context via Node.js `AsyncLocalStorage`.

### Why removing `workspaceId` filter from a controller STILL CANNOT leak data
Even if a developer writes `Task.findById(id)` or `Task.find({})` in an Express controller without filtering by `workspaceId`:
- The custom Mongoose plugin (`server/src/plugins/tenantGuard.js`) automatically intercepts:
  - `find`, `findOne`, `findOneAndUpdate`, `deleteOne`, `updateOne`, `countDocuments`, and `aggregate`.
- It fetches the active `workspaceId` from `AsyncLocalStorage` and **forces `{ workspaceId: activeTenantId }` into the query filter at the MongoDB driver layer**.
- If a query is attempted without an active workspace context, the plugin **immediately throws a runtime exception**, aborting the operation before any data can leak.

---

## 3. Core Technical Decisions & Plain-English Explanations

### A. Fractional / Gap-Ordering Strategy for Real-Time Kanban
* **Problem:** Moving a card between two cards in traditional arrays requires incrementing or shifting the order of all downstream cards (`O(N)` updates), causing database locks and race conditions during concurrent edits.
* **Our Solution:** Every card has a floating-point `order` number (e.g. 1000, 2000, 3000). When a card is moved between Card A (order 1000) and Card B (order 2000), its new order is calculated as:
  $$\text{newOrder} = \frac{\text{order}_A + \text{order}_B}{2} = 1500$$
* **Advantage:** Reordering is an $O(1)$ single-row update that prevents concurrent collision and broadcasts smoothly over WebSockets.

### B. Single-Use Cryptographic Invitation Hashing
* **Problem:** Storing raw invitation tokens in the database exposes user accounts if database dumps or backups are compromised.
* **Our Solution:** 
  1. The server generates a high-entropy 32-byte cryptographic random token.
  2. Only its one-way **SHA-256 hash** (`tokenHash`) is stored in MongoDB with a 48-hour expiration timestamp.
  3. The raw token is sent to the user via email (or displayed in local development mode).
  4. Upon acceptance, the incoming token is hashed with SHA-256 and matched against `tokenHash`. Once accepted, the record is marked `used: true` and cannot be reused.

---

## 4. Quick Start & Evaluation Guide

### Prerequisites
- Node.js (v18+) & npm
- *Zero-Config Database:* If you do not have MongoDB Atlas or local MongoDB running, the application **automatically spins up an embedded in-memory MongoDB engine (`mongodb-memory-server`) with zero setup!**

### Run with a Single Command
From the root repository directory:
```bash
npm run dev
```
* Starts the Express backend on `http://localhost:5000`
* Starts the React Vite frontend on `http://localhost:5173`

### Database Utility Scripts
```bash
npm run seed       # Seeds realistic demo data (2 workspaces, 4 roles, 3 projects, 25+ tasks)
npm run db:clear   # Completely wipes all data, resetting database to pristine empty state
```

---

## 5. Automated Multi-Tenant Isolation Test

Run the automated verification suite to prove complete tenant separation:
```bash
npm run test:isolation
```
**Output Summary Table:**
```
┌─────────┬────────────────────────────────┬───────────────────────────────────────────────────────┬───────────────────────────────┬─────────────────────┬───────────┐
│ (index) │ Test                           │ Description                                           │ Expected                      │ Actual              │ Status    │
├─────────┼────────────────────────────────┼───────────────────────────────────────────────────────┼───────────────────────────────┼─────────────────────┼───────────┤
│ 0       │ '1. Guard Crash Protection'    │ 'Query tenant model without context'                  │ 'Throws TenantGuard Error'    │ 'Threw Error'       │ '✅ PASS' │
│ 1       │ '2. Cross-Tenant Read'         │ 'Workspace A queries Workspace B Task by ID'          │ 'null (404 Not Found)'        │ 'null (Protected)'  │ '✅ PASS' │
│ 2       │ '3. Cross-Tenant Tamper Guard' │ 'Workspace A forces workspaceId=Workspace B in query' │ 'null (Override to Tenant A)' │ 'null (Protected)'  │ '✅ PASS' │
│ 3       │ '4. Cross-Tenant Update'       │ 'Workspace A attempts update on Workspace B Task'     │ 'matchedCount = 0'            │ 'matchedCount = 0'  │ '✅ PASS' │
│ 4       │ '5. Cross-Tenant Delete'       │ 'Workspace A attempts delete on Workspace B Task'     │ 'deletedCount = 0'            │ 'deletedCount = 0'  │ '✅ PASS' │
│ 5       │ '6. RBAC Guest Create Task'    │ 'Guest role checks permission for task:create'        │ 'false (Denied)'              │ 'false'             │ '✅ PASS' │
│ 6       │ '7. RBAC Member Invite'        │ 'Member role checks permission for member:invite'     │ 'false (Denied)'              │ 'false'             │ '✅ PASS' │
│ 7       │ '8. RBAC Admin Privileges'     │ 'Admin role checks project:create & member:invite'    │ 'true & true (Allowed)'       │ 'true & true'       │ '✅ PASS' │
│ 8       │ '9. Single-Use Invite Token'   │ 'Invite token reuse attempt'                          │ 'Blocked (already used)'      │ 'Blocked (Used)'    │ '✅ PASS' │
│ 9       │ '10. Expired Invite Token'     │ 'Invite token past 48h expiration window'             │ 'Blocked (Expired)'           │ 'Blocked (Expired)' │ '✅ PASS' │
└─────────┴────────────────────────────────┴───────────────────────────────────────────────────────┴───────────────────────────────┴─────────────────────┴───────────┘
```

---

## 6. Demo Evaluation Credentials

Password for all pre-seeded evaluation accounts: `password123`

| User | Email | Role | Scope | Purpose in Evaluation |
|---|---|---|---|---|
| **Dhruv (Owner)** | `owner@acme.com` | Owner | Acme Corp | Full permissions, workspace switching, member roles |
| **Sarah (Admin)** | `admin@acme.com` | Admin | Acme Corp | Can create projects & send invites, cannot delete workspace |
| **Alex (Member)** | `member@acme.com` | Member | Acme Corp | Can move/create tasks and comment, cannot invite members |
| **Greg (Guest)** | `guest@acme.com` | Guest | Acme Corp | Strictly read-only, cannot drag cards or create tasks |
| **Hank (Globex)** | `hank@globex.com` | Owner | Globex Corp | Proves User in Acme Corp cannot view Globex projects/tasks |

*(Note: The login page has 1-click Fast-Fill demo buttons for all these users!)*

---

## 7. API Endpoints Surface (`/api`)

### Auth & Tenancy
* `POST /api/auth/register` — Register user, returns JWT
* `POST /api/auth/login` — Login user, returns JWT and active workspace
* `GET  /api/auth/me` — Authenticated profile and active workspace claims
* `POST /api/workspaces` — Create workspace (creates owner membership)
* `GET  /api/workspaces` — List workspaces authenticated user belongs to
* `POST /api/workspaces/:id/switch` — Switch active workspace, returns new scoped JWT

### Workspace Members & Invites
* `GET    /api/workspaces/:id/members` — List members with roles
* `PATCH  /api/workspaces/:id/members/:userId` — Update member role (Owner/Admin)
* `DELETE /api/workspaces/:id/members/:userId` — Remove member (Owner/Admin)
* `POST   /api/workspaces/:id/invites` — Generate SHA-256 signed invite token
* `GET    /api/invites/details?token=...` — View invite metadata
* `POST   /api/invites/accept` — Accept invitation and activate membership

### Projects & Kanban Tasks
* `GET    /api/projects` — List projects (with task counts & completion progress)
* `POST   /api/projects` — Create project
* `PATCH  /api/projects/:id` — Update project details
* `DELETE /api/projects/:id` — Archive or permanently delete project
* `GET    /api/projects/:id/tasks` — List tasks with filters (`?status=&assignee=`)
* `POST   /api/tasks` — Create task
* `GET    /api/tasks/:id` — Task details with comments and subtasks
* `PATCH  /api/tasks/:id` — Update task fields
* `DELETE /api/tasks/:id` — Delete task and subtasks
* `PATCH  /api/tasks/:id/move` — Drag-and-drop card move with fractional ordering
* `POST   /api/tasks/:id/comments` — Post comment on task
* `GET    /api/tasks/:id/comments` — Retrieve comment thread

### Personal Tasks, Time Logs, Notifications, Reports & Audit
* `GET    /api/tasks/mine` — Tasks assigned to current user across all projects
* `GET    /api/projects/:id/sprints` & `POST /api/sprints` — Sprint CRUD, start, complete & backlog moves
* `GET    /api/tasks/:id/timelogs` & `POST /api/tasks/:id/timelogs` — Log hours on a task
* `PATCH  /api/timelogs/:id` & `DELETE /api/timelogs/:id` — Edit/delete own time logs
* `GET    /api/timelogs/timesheet?weekStart=` — Weekly timesheet grid per user
* `POST   /api/tasks/:id/attachments` & `DELETE /api/tasks/:id/attachments/:attachmentId` — Cloudinary/local file attachments
* `GET    /api/notifications` & `PATCH /api/notifications/:id/read` — @mention notifications
* `GET    /api/reports/burndown?sprintId=` | `GET /api/reports/velocity` | `GET /api/reports/workload` — Redis-cached aggregation reports
* `GET    /api/dashboard/summary` — Dynamic counts by status, priority, overdue & open tasks
* `GET    /api/activity?limit=` & `GET /api/activity/audit` — Append-only audit trail (audit endpoint Owner/Admin only)
* `GET    /api/health` — System uptime and health status

---

## 8. Environment Variables Reference

| Variable | Location | Description |
| :--- | :--- | :--- |
| `PORT` | `server/.env` | API port (default `5000`) |
| `MONGO_URI` | `server/.env` | MongoDB Atlas URI (empty = local `mongodb-memory-server`) |
| `JWT_SECRET` | `server/.env` | Signing secret (use distinct values for staging vs prod) |
| `CLIENT_URL` | `server/.env` | Allowed CORS origin (e.g. `https://app.vercel.app`) |
| `REDIS_URL` | `server/.env` | Upstash Redis `rediss://` URL (empty = in-memory fallback) |
| `CLOUDINARY_CLOUD_NAME` / `API_KEY` / `API_SECRET` | `server/.env` | Cloudinary upload credentials (empty = local `/uploads` fallback) |
| `SMTP_HOST` / `PORT` / `USER` / `PASS` / `FROM` | `server/.env` | Nodemailer / SendGrid SMTP settings |
| `SENTRY_DSN` / `LOG_LEVEL` | `server/.env` | Sentry DSN & Pino log level |
| `VITE_API_URL` / `VITE_SOCKET_URL` / `VITE_SENTRY_DSN` | `client/.env` | Frontend API, WebSocket & Sentry endpoints |

---

## 9. Viva Prep — Placement & Architecture Q&A

1. **What is multi-tenancy? Shared-DB vs DB-per-tenant:**
   Multi-tenancy means a single application serves multiple isolated organizations (tenants). In **Shared-DB** (used here with `workspaceId` on every collection), all tenants share collections, keeping infrastructure costs low and migrations simple, while enforcing isolation in software. **DB-per-tenant** gives physical separation and noisy-neighbor isolation at higher operational and connection-pool cost.
2. **How do you guarantee a query never crosses workspace boundaries, and where does `workspaceId` come from?**
   `workspaceId` comes **strictly from the verified JWT claim** (`resolveTenant` middleware reads `req.user.workspaceId`, never `req.body` or `req.query`). It is stored in Node's `AsyncLocalStorage`, and our central Mongoose plugin (`server/src/plugins/tenantGuard.js`) intercepts `find*`, `update*`, `delete*`, `save`, `insertMany`, `aggregate`, and `bulkWrite` to inject `workspaceId` automatically—throwing `[TenantGuard Violation]` if context is missing.
3. **Design your permission model — how is deleting a project authorized?**
   We use a central RBAC matrix in `server/src/utils/permissions.js` (`owner`, `admin`, `member`, `guest`) enforced by `authorize(permission)` middleware. Only `owner` has `project:delete`, while `admin` has `project:archive`, `member` can create/move/log time on tasks (and edit/delete only their own time logs), and `guest` is strictly read-only.
4. **How are invitation tokens generated/validated, and why do they expire and stay single-use?**
   `crypto.randomBytes(32)` generates a high-entropy raw token sent in the invite link; only its **SHA-256 hash** (`hashToken`) is stored in MongoDB (`Invite`). On accept, we hash the incoming token, verify `!invite.used` and `now <= invite.expiresAt` (48h TTL), activate membership, and set `used = true`. Expiry limits the attack window of leaked emails, and single-use prevents replay attacks.
5. **How do you keep drag-and-drop ordering consistent when two users reorder simultaneously?**
   We use **fractional gap ordering** (`order = (prev.order + next.order) / 2` with initial 1000 spacing) in `PATCH /api/tasks/:id/move`. Concurrent moves only update the single moved document in $O(1)$ without shifting sibling rows, and if repeated insertions shrink a gap below `0.001`, the server runs an automatic `bulkWrite` column rebalance to restore `1000, 2000, 3000...` spacing.
6. **How does the audit trail satisfy an enterprise compliance requirement?**
   Every mutation appends an immutable `Activity` record (`createdAt` only, no update/delete endpoints) capturing `actorId`, `entityType`, `entityId`, `action`, and field-level diffs (`meta.diffs: [{ field, from, to }]`). The workspace-wide Audit Log (`GET /api/activity/audit`) is restricted to `owner`/`admin` and filterable by actor, entity, and date range.

---

## 10. Assumptions Made
1. **Fallback Database:** If `MONGO_URI` is not provided in `.env`, the system automatically spins up `mongodb-memory-server` for instantaneous evaluation without external database configuration.
2. **Email, Redis & Cloudinary Fallbacks:** If `SMTP_*`, `REDIS_URL`, or `CLOUDINARY_*` are omitted in local dev, invite links are returned in `devInviteLink`, Redis falls back to in-memory adapter/cache, and file uploads fall back to `server/uploads/`.
3. **Task Deletion:** Deleting a parent task cascades to delete its subtasks and associated comments to prevent orphaned database records.
4. **Sprint Scope:** Only one sprint per project can be `active` at a time; completing a sprint moves unfinished tasks either back to the Backlog (`sprintId: null`) or to another planned sprint.

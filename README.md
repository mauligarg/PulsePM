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

### Personal Tasks & Dynamic Dashboard
* `GET /api/tasks/mine` — Tasks assigned to current user across all projects
* `GET /api/dashboard/summary` — Dynamic counts by status, priority, overdue & open tasks
* `GET /api/activity?limit=` — Audit trail feed of workspace events
* `GET /api/health` — System uptime and health status

---

## 8. Assumptions Made
1. **Fallback Database:** If `MONGO_URI` is not provided in `.env`, the system automatically spins up `mongodb-memory-server` for instantaneous evaluation without external database configuration.
2. **Email Fallback:** If SMTP credentials are not configured, invitation links are logged to the backend console AND returned in a developer-friendly response field `devInviteLink`, with a direct copy/test button in the UI.
3. **Task Deletion:** Deleting a parent task cascades to delete its subtasks and associated comments to prevent orphaned database records.

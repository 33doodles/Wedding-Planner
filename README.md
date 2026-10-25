# 💍 VowCraft — Modular Wedding Planning App (Beta)

An all-encapsulating, mobile-first and desktop-responsive wedding planning web application with a persistent Node.js/Express backend and one-command Docker deployment.

## ✨ Key Features

1. **Wedding Style Presets & Modularity**
   - Switch between **Classic & Traditional**, **Micro-Wedding / Intimate**, **Adventure Elopement**, **Destination Weekend**, or **Backyard / DIY Celebration**.
   - **Grey Out / Skip Anything**: Don't want a photographer, transportation, or a cake? Flip its toggle switch off. Disabled modules visually grey out and automatically exclude their costs and tasks from your active budget and progress metrics—without deleting your saved notes if you change your mind later.
   - **Task-Level Skipping**: Mark individual checklist items as **Skip / N/A** to grey them out individually.
2. **Fillable Vendor & Preparation Worksheets**
   - Pre-built fillable worksheets for **Venue**, **Catering & Bar**, **Photography & Video**, **Music/DJ**, **Florals & Decor**, **Attire & Hair/Makeup**, **Officiant & Legal**, **Cake & Desserts**, **Stationery**, **Transportation**, and **Travel/Honeymoon**.
   - Add unlimited **Custom Modules** (e.g., *Photo Booth*, *Cultural Tea Ceremony*, *Rehearsal Dinner*) and **Custom Fields** inside any module.
3. **Invite & Guest List Manager**
   - Track households, headcount, RSVP status (`Attending`, `Awaiting RSVP`, `Declined` — declined guests automatically grey out), meal selections, dietary restrictions, table assignments, and mailing addresses.
   - One-tap trackers for **Save-the-Date Sent**, **Formal Invite Sent**, and **Thank You Card Mailed**.
   - Export your full guest list to **CSV** or full wedding state to **JSON**.
4. **Mobile-First + Desktop Web Experience**
   - Bottom navigation bar and thumb-friendly controls on mobile devices (with PWA home-screen install support) alongside a multi-column dashboard on desktop browsers.

---

## 🐳 Run via Docker (Recommended)

### Option 1: Docker Compose (with persistent volume)
```bash
docker compose up -d --build
```
Then open **http://localhost:3000** on your computer or phone.

### Option 2: Direct Docker Build & Run
```bash
docker build -t vowcraft-wedding-planner:beta .
docker run -d -p 3000:3000 -v vowcraft_data:/app/data -e APP_PASSWORD='change-me' --name vowcraft vowcraft-wedding-planner:beta
```

### Option 3: GitHub Container Registry (GHCR)
When pushed to GitHub, the included workflow (`.github/workflows/docker-publish.yml`) automatically builds and publishes your Docker image to `ghcr.io/<your-username>/<repo-name>:beta`.

---

## 🔐 Security & Configuration

| Variable | Default | What it does |
|---|---|---|
| `APP_PASSWORD` | _(unset)_ | Turns on a password login. **Set this** unless the app is only reachable by you. Changing it signs everyone out. |
| `SESSION_DAYS` | `30` | How long a device stays signed in. |
| `TRUST_PROXY` | _(unset)_ | Number of reverse proxies in front of the app (usually `1`). Needed for correct client IPs (login rate limit) and `Secure` cookies over HTTPS. |
| `SEED_SAMPLE_DATA` | `true` | First run only: `false` starts with a blank plan instead of the demo wedding. |
| `BACKUP_KEEP` | `20` | Number of rotating snapshots kept in `data/backups/`. |
| `BACKUP_INTERVAL_MINUTES` | `10` | Minimum time between automatic snapshots (imports and resets always take one). |
| `DATA_DIR` | `./data` | Where `wedding-data.json`, `backups/` and `.session-secret` live. |

How it's protected:

- **Login:** with `APP_PASSWORD` set, every `/api` call needs a signed, `HttpOnly`, `SameSite=Strict` session cookie. Failed logins are limited to 10 per 15 minutes per IP.
- **No CORS:** the front end is same-origin, so no CORS headers are sent and other websites can't read the API from your browser.
- **CSRF guard:** every state-changing request must send `X-Requested-With: VowCraft`, which other sites can't do without a CORS preflight.
- **Validation:** `PUT /api/state` and imports are checked against the expected shape before anything is saved.
- **Headers:** strict Content-Security-Policy (`script-src 'self'`), `nosniff`, `frame-ancestors 'none'`, `no-referrer`.
- **Self-contained:** fonts are bundled (`public/fonts`, SIL OFL 1.1), so the app makes no outside requests.

Even with a password, it's best to put the app behind HTTPS (a reverse proxy) if it's reachable from outside your home network.

## 💾 Data Safety

- Saves are **atomic** (write to a temp file, `fsync`, then rename), so a crash can't leave a half-written file.
- **Rotating snapshots** go to `data/backups/` (at most every 10 minutes, plus before every import and reset).
- If `wedding-data.json` is ever unreadable, it is **never replaced with demo data**: a copy is kept as `wedding-data.json.corrupt-<time>`, the newest valid snapshot is restored, and if there isn't one the server refuses to start.
- **Edit conflicts:** every save carries a revision number. If another device saved first, the server answers `409` and the app shows the latest version instead of silently overwriting it. Tabs also refresh when you switch back to them.

## 🧩 Organising Modules

- **▲ / ▼** on each module (Overview and Prep & Vendors) changes the order.
- **⧉ Duplicate** copies a module's fields, options and checklist titles, with nothing filled in (for example to split Photography and Videography).
- **✕** deletes a module (switching it off keeps its notes instead).
- **Settings → Date & Number Format / Currency** sets the locale and currency used throughout.
- **Settings → Start a Blank Plan** clears the demo data but keeps every module and checklist.

## 💻 Local Development (Node.js)

```bash
npm install
npm start
```
The server starts on `http://localhost:3000` and persists data to `./data/wedding-data.json`.

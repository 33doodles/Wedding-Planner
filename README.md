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
docker run -d -p 3000:3000 -v vowcraft_data:/app/data --name vowcraft vowcraft-wedding-planner:beta
```

### Option 3: GitHub Container Registry (GHCR)
When pushed to GitHub, the included workflow (`.github/workflows/docker-publish.yml`) automatically builds and publishes your Docker image to `ghcr.io/<your-username>/<repo-name>:beta`.

---

## 💻 Local Development (Node.js)

```bash
npm install
npm start
```
The server starts on `http://localhost:3000` and persists data to `./data/wedding-data.json`.

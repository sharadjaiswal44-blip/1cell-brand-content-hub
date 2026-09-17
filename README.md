# 1Cell.Ai Brand & Content Hub - Complete Platform Package

A centralized enterprise digital asset management & brand content hub built for **1Cell.Ai**.

---

## 📦 What's Included in this Package

1. **Frontend Web Platform**:
   - `index.html`: Main application interface with dynamic navigation, filters, Chrome tab icon, and asset viewers.
   - `styles.css`: Custom responsive UI styling aligned with 1Cell primary & secondary brand colors.
   - `app.js`: Core client application logic, search, modal viewers, filtering, product owner routing, and local persistence.
   - `db.js`: Built-in offline asset repository and initial data seed.
   - `cloud-config.js` & `supabase-config.js`: Cloud & Supabase backend integration configuration.
   - `supabase-service.js`: Live Supabase REST & Storage client with fallback sync.

2. **Database & Schema**:
   - `supabase_schema_and_seed.sql`: Complete PostgreSQL / Supabase migration script with schema, table definitions, RLS security policies, and seed data.
   - `backup_seed_assets.json`: JSON format backup of all product and company assets.

3. **Logos & Brand Identity** (`assets/logos/`):
   - High-resolution brand logos for 1Cell, iCore, OncoIndx, OncoIndx Prime+, OncoIndx TBx, OncoCTC, OncoRisk, OncoIncytes, OncoAlibrex, OncoMonitor, OncoPredikt, OncoHRD, OncoTarget, etc.
   - `favicon.png`, `favicon.ico`, and `sphere_icon.png` (3D Gradient Sphere icon for browser tab / profile).

4. **Documents, Guidelines & Media** (`assets/docs_and_guidelines/`):
   - All uploaded corporate brochures, brand guidelines, assay overview PDFs, and high-res media.

---

## 🚀 How to Host & Deploy

### Option 1: Instant Static Hosting (GitHub Pages, Netlify, Vercel, Cloudflare Pages, S3, Firebase Hosting)
This platform is a zero-dependency, vanilla modern Web Application.
- Simply upload or extract all files to your static hosting webroot (e.g. `public_html`, Netlify drop, Vercel root, or GitHub Pages branch).
- Load `index.html` in any modern web browser.

### Option 2: Run Locally
You can run a local web server with any of the following:
```bash
# Python 3
python3 -m http.server 8000

# Node.js npx
npx serve .

# VS Code / Cursor
Use the "Live Server" extension on index.html
```
Then visit `http://localhost:8000` in your browser.

### Option 3: Supabase Cloud Database (Optional for Live Multi-User Sync)
1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in Supabase and run the SQL commands in `supabase_schema_and_seed.sql`.
3. In `supabase-config.js`, enter your project's `supabaseUrl` and `supabaseAnonKey`.
4. The platform will automatically sync live asset updates across all team members in real-time.

---

## 👥 Product Owners Configured
- **Vikas**: OncoIndx, OncoIndx Prime+, OncoIndx TBx
- **Sharad**: OncoCTC, OncoRisk
- **Dr. Pranad**: OncoIncytes, OncoAlibrex, OncoMonitor
- **Arjvee**: OncoPredikt

# Switchboard

Reverse proxy ringan dengan dashboard web. Kelola route upstream, SSL/TLS, dan user admin lewat UI atau REST API.

## Fitur

- **Reverse proxy** — arahkan path ke upstream URL dengan hot reload
- **Dashboard** — kelola route dari browser
- **SSL/HTTPS** — sertifikat custom atau Let's Encrypt (auto-renew)
- **Basic auth** — proteksi UI dan API
- **File-based config** — semua konfigurasi di folder `data/`

## Persyaratan

- Node.js 18+ (untuk install manual)
- npm
- Docker & Docker Compose (opsional)

## Docker

Cara paling cepat untuk production:

```bash
docker compose up -d --build
```

Dashboard: `http://localhost:8080`

### Port

| Port | Fungsi |
|------|--------|
| 8080 | HTTP default (non-SSL) |
| 8443 | HTTPS default |
| 80 | HTTP — Let's Encrypt HTTP-01 |
| 443 | HTTPS production |

Container pakai `NET_BIND_SERVICE` supaya bisa bind port 80/443 tanpa root.

### Data persisten

Config dan sertifikat disimpan di `./data` via volume mount. Backup folder ini secara berkala.

### Upstream dari container

`localhost` di dalam container bukan host machine. Untuk service di host:

- **macOS / Windows:** `http://host.docker.internal:3000`
- **Linux:** tambahkan ke compose:
  ```yaml
  extra_hosts:
    - "host.docker.internal:host-gateway"
  ```
- **Service lain di compose:** pakai nama service, mis. `http://api:3000`

### Let's Encrypt

1. Pastikan domain mengarah ke server
2. Port 80 & 443 terbuka ke container
3. Set `httpPort: 80` di `/ssl` sebelum request sertifikat

## Instalasi

```bash
npm install
npm run css    # build Tailwind CSS (terminal terpisah, atau sekali saat setup)
npm run dev    # development dengan hot reload
```

Production:

```bash
npm run css
npm run build
npm start
```

Server default: `http://0.0.0.0:8080`

## Login

Default credentials (ubah segera setelah setup):

| Username | Password |
|----------|----------|
| `admin`  | `admin`  |

Login via HTTP Basic Auth saat mengakses dashboard atau API.

## Konfigurasi

Semua file config ada di `data/`:

| File | Fungsi |
|------|--------|
| `app.json` | Host & port server |
| `routes.json` | Daftar route proxy |
| `users.json` | User admin |
| `ssl.json` | Pengaturan HTTPS |
| `certs/` | Sertifikat TLS (auto-generated untuk Let's Encrypt) |

### Contoh route

```json
{
  "routes": [
    {
      "id": "api",
      "enabled": true,
      "path": "/api/v1",
      "target": "http://localhost:3000",
      "stripPrefix": true
    }
  ]
}
```

- `path` — prefix URL yang di-proxy
- `target` — upstream URL
- `stripPrefix` — hapus prefix path sebelum diteruskan ke upstream

### SSL

Dua provider tersedia di `ssl.json`:

- **custom** — path ke file sertifikat & private key
- **letsencrypt** — otomatis via HTTP-01 challenge (port 80 harus reachable)

Saat SSL aktif, server listen di dua port: HTTP (`httpPort`) dan HTTPS (`httpsPort`). Redirect HTTP→HTTPS bisa diaktifkan lewat `redirectHttpToHttps`.

## API

Semua endpoint di bawah memerlukan Basic Auth.

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/health` | Health check (tanpa auth) |
| GET/POST/PATCH/DELETE | `/api/routes` | CRUD route proxy |
| GET/PUT | `/api/settings/app` | Config server |
| GET/POST/PATCH/DELETE | `/api/settings/users` | Manajemen user |
| GET/PATCH | `/api/ssl` | Config SSL |
| GET | `/api/ssl/status` | Status sertifikat |
| POST | `/api/ssl/request` | Request sertifikat Let's Encrypt |
| POST | `/api/ssl/renew` | Perpanjang sertifikat |
| POST | `/api/ssl/reload` | Restart server untuk apply SSL |

Perubahan config app/SSL memicu restart server otomatis (~300ms delay).

## Halaman Web

| Path | Fungsi |
|------|--------|
| `/` | Dashboard — kelola route |
| `/settings/app` | Pengaturan host & port |
| `/settings/users` | Manajemen user |
| `/ssl` | Konfigurasi HTTPS |
| `/logout` | Logout |

## Path reserved

Route proxy tidak akan menimpa path berikut:

`/health`, `/api/*`, `/public/*`, `/settings/*`, `/ssl/*`, `/logout`, `/.well-known/*`

## Scripts

| Script | Fungsi |
|--------|--------|
| `npm run dev` | Dev server (`tsx watch`) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Jalankan production build |
| `npm run css` | Compile Tailwind CSS (watch) |
| `npm run css:build` | Compile Tailwind CSS (production) |

## Struktur

```
src/
├── server.ts          # Entry point & restart handler
├── app.ts             # Fastify app setup
├── modules/
│   ├── config/        # Load/save config JSON
│   ├── dashboard/     # Route management UI & API
│   ├── proxy/         # Reverse proxy engine
│   ├── settings/      # App & user settings
│   └── ssl/           # TLS & Let's Encrypt
├── plugins/           # Auth, static, view
├── views/             # Eta templates
└── public/            # CSS & JS frontend
```

## Lisensi

ISC

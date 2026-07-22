# Switchboard

Lightweight reverse proxy with a web dashboard. Manage upstream routes, TLS certificates, and admin users from the UI or REST API — configuration lives in plain JSON under `data/`.

[![CI](https://github.com/arubaya/switchboard/actions/workflows/ci.yml/badge.svg)](https://github.com/arubaya/switchboard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- **Reverse proxy** — path-based routing to upstream services with hot reload
- **Dashboard** — manage routes from the browser
- **SSL / HTTPS** — custom certificates or Let's Encrypt with auto-renew
- **Basic auth** — protect the management UI and API
- **Backup & restore** — download a full `data/` ZIP; restore configs and certs individually
- **File-based config** — all state in `data/` (easy to version, backup, and migrate)
- **Docker-first** — `git clone` → `docker compose up -d`

## Screenshots

> Place screenshots in [`docs/screenshots/`](docs/screenshots/) and embed them here.

| Dashboard | SSL | Settings |
| --------- | --- | -------- |
| ![Dashboard](docs/screenshots/dashboard.png) | ![SSL](docs/screenshots/ssl.png) | ![Settings](docs/screenshots/settings.png) |

## Quick Start

```bash
git clone https://github.com/arubaya/switchboard.git
cd switchboard
cp .env.example .env
docker compose up -d --build
```

Open **http://localhost:8080**

| Username | Password |
| -------- | -------- |
| `admin`  | `admin`  |

Change the default password immediately after first login.

## Docker deployment

### Ports

| Host port | Purpose |
| --------- | ------- |
| `8080` | HTTP (default management / proxy) |
| `8443` | HTTPS (default) |
| `80` | HTTP — required for Let's Encrypt HTTP-01 |
| `443` | HTTPS in production |

The container uses `NET_BIND_SERVICE` so it can bind 80/443 without running as root.

### Persist data

Config and certificates are mounted at `./data`:

```yaml
volumes:
  - ./data:/app/data
```

Back up this directory regularly (or use **Settings → Backup**).

### Upstream hosts from Docker

Inside the container, `localhost` is not your host machine.

| Target | Example |
| ------ | ------- |
| Host machine (macOS / Windows / Linux with `extra_hosts`) | `http://host.docker.internal:3000` |
| Another Compose service | `http://api:3000` |

Optional env (see `.env.example`):

```bash
SWITCHBOARD_UPSTREAM_HOST=host.docker.internal
```

### Let's Encrypt

1. Point your domain's DNS at the server
2. Expose ports `80` and `443` to the container
3. In **SSL**, set HTTP port to `80`, then request a certificate

## Development setup

Requirements: Node.js 20+, npm

```bash
npm install
npm run css:build   # or: npm run css (watch)
npm run dev
```

Production build:

```bash
npm run css:build
npm run build
npm start
```

Checks:

```bash
npm run lint
npm run build
npm test
```

## Configuration overview

All config files live in `data/` and include a `schemaVersion` field for future migrations.

| File | Purpose |
| ---- | ------- |
| `app.json` | Bind host & port |
| `routes.json` | Proxy routes |
| `users.json` | Admin users |
| `ssl.json` | HTTPS settings |
| `certs/` | TLS material (custom or Let's Encrypt) |

### Example route

```json
{
  "schemaVersion": 1,
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

### API (selected)

All `/api/*` endpoints except `/api/version` require Basic Auth.

| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/health` | Health check |
| `GET` | `/api/version` | Version / build / commit |
| `GET/POST/PATCH/DELETE` | `/api/routes` | Proxy routes |
| `GET/PUT` | `/api/settings/app` | App config |
| `GET/POST/PATCH/DELETE` | `/api/settings/users` | Users |
| `GET` | `/api/settings/backup` | Download `data/` ZIP |
| `PUT` | `/api/settings/restore/{app,routes,ssl,users}` | Restore JSON config |
| `POST` | `/api/settings/restore/certs` | Upload certificate files |
| `GET/PATCH` | `/api/ssl` | SSL config |
| `POST` | `/api/ssl/request` | Request Let's Encrypt cert |

Reserved paths (not proxied): `/health`, `/api/*`, `/public/*`, `/settings/*`, `/ssl/*`, `/logout`, `/.well-known/*`

## Roadmap

- [ ] Password hashing for admin users
- [ ] Config schema migrations beyond `schemaVersion: 1`
- [ ] Optional OIDC / SSO for the dashboard
- [ ] Metrics and access logs export
- [ ] Multi-host / SNI routing
- [ ] Automated end-to-end tests in CI

See also [CHANGELOG.md](CHANGELOG.md).

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE)

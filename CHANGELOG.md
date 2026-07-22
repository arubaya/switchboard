# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Backup and restore under Settings (ZIP backup of `data/`, per-file restore)
- `GET /api/version` exposing version, build, and commit metadata
- `schemaVersion` on all JSON configuration files
- Open-source release docs (`CONTRIBUTING`, `SECURITY`, `CODE_OF_CONDUCT`, MIT license)
- GitHub Actions CI and issue/PR templates

## [1.0.0] - 2026-07-22

### Added

- Reverse proxy with path-based routing and hot reload
- Web dashboard for routes, settings, users, and SSL
- Custom TLS certificates and Let's Encrypt (HTTP-01) support
- Basic authentication for management UI and API
- Docker and Docker Compose deployment
- File-based configuration under `data/`

[Unreleased]: https://github.com/arubaya/switchboard/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/arubaya/switchboard/releases/tag/v1.0.0

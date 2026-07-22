# Contributing to Switchboard

Thanks for helping improve Switchboard. This guide keeps contributions small,
reviewable, and consistent with the project.

## Code of Conduct

By participating, you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting started

1. Fork the repository and clone your fork
2. Install dependencies: `npm install`
3. Build CSS once: `npm run css:build`
4. Start the dev server: `npm run dev`
5. Open http://localhost:8080 (default login: `admin` / `admin`)

## Development workflow

1. Create a branch from `main` (`feature/...`, `fix/...`, or `docs/...`)
2. Make focused changes — prefer the smallest working diff
3. Run checks locally:

   ```bash
   npm run lint
   npm run build
   npm test
   ```

4. Open a pull request against `main`

## Pull requests

- Describe **why** the change is needed
- Link related issues
- Keep PRs focused (one concern per PR when practical)
- Update docs / changelog when behavior changes
- Do not commit secrets, production config, or real certificates

## Coding guidelines

- TypeScript + Fastify patterns already used in the repo
- Prefer reuse over new abstractions
- Avoid new dependencies unless necessary
- Validate untrusted input at API boundaries
- File-based config lives under `data/` with `schemaVersion` for migrations

## Reporting bugs & requesting features

Use the GitHub issue templates:

- Bug report
- Feature request

## Security

See [SECURITY.md](SECURITY.md) for private vulnerability reporting.

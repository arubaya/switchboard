# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

## Reporting a Vulnerability

Do **not** open a public GitHub issue for security vulnerabilities.

Please report security issues privately via one of:

- GitHub Security Advisories:
  https://github.com/arubaya/switchboard/security/advisories/new
- Email the maintainer through the contact listed on the
  [GitHub profile](https://github.com/arubaya)

Include as much detail as possible:

- Affected version / commit
- Steps to reproduce
- Impact assessment
- Any proof-of-concept (non-destructive)

We aim to acknowledge reports within 7 days and provide a remediation timeline
after triage.

## Hardening checklist

Before exposing Switchboard to the internet:

1. Change the default `admin` / `admin` credentials in `data/users.json`
2. Prefer HTTPS (custom cert or Let's Encrypt)
3. Keep `data/` private and backed up — it contains credentials and TLS keys
4. Restrict management UI access (firewall, VPN, or reverse proxy ACLs)
5. Do not commit real certificates, private keys, or production passwords

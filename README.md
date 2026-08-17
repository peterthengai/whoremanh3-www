# WhoremanH3 public website

Source for the public [Whoreman Hash House Harriers website](https://www.whoremanh3.com/). It is a small, dependency-light static site served by a Cloudflare Worker with Static Assets.

## How it fits together

| Path | Purpose |
| --- | --- |
| `src/content/*.html` | Editable body content for the eight public pages |
| `src/pages.mjs` | Page routes, titles, descriptions, and other metadata |
| `src/site.css` | Site-wide styles |
| `src/site.js` | Mobile navigation and contact-form behavior |
| `scripts/build.mjs` | Generates complete HTML, hashed assets, the sitemap, robots file, and 404 page into `dist/` |
| `src/worker.js` | Apex redirect, static-asset delivery, retired routes, security headers, and the contact API |
| `tests/site.test.mjs` | Build, routing, metadata, contact, and asset checks |
| `wrangler.jsonc` | Production Cloudflare Worker and custom-domain configuration |

## Local work

```powershell
npm ci
npm run build
npm run dev
```

Edit page copy in `src/content/`, edit its metadata in `src/pages.mjs`, then run `npm run check`. The generated `dist/` directory is intentionally ignored; do not edit or commit it.

The default Wrangler configuration is production-oriented. Local development still runs on a local Wrangler address, while deployment maps both public hostnames to the Worker. Apex GET/HEAD requests redirect to canonical `www`. The contact form sends through Brevo after server-side Turnstile validation.

## Configuration

- `TURNSTILE_SITE_KEY` is a public build-time override; the production public key is the default in `scripts/build.mjs`.
- `TURNSTILE_SECRET` and `BREVO_API_KEY` are encrypted Worker secrets and must never be committed.
- `CONTACT_FROM`, `CONTACT_TO`, and `CONTACT_DRY_RUN` are non-secret Worker variables in `wrangler.jsonc`.
- The Turnstile widget definition is in `infra/turnstile/`; its Terraform state belongs outside the repository.

## Production operations

1. Run `npm run check` before deployment.
2. Deploy with `npm run deploy`.
3. The managed Turnstile widget is provisioned from `infra/turnstile`, and its public site key is configured in the build.
4. The matching `TURNSTILE_SECRET` and dedicated `BREVO_API_KEY` are stored only as Worker secrets.
5. Preserve every non-web DNS record when changing the two public custom domains.

Terraform state is stored outside the repository under `%LOCALAPPDATA%\WhoremanH3\terraform` because it contains the widget secret.

See `docs/OPERATIONS.md` for the verified production baseline and deployment checklist.

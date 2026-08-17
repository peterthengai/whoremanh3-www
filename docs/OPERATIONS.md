# Production operations

## Verified baseline

- Cutover: August 10, 2026
- Worker: `whoremanh3-www-preview` (the historical script name was retained so verified secrets stayed attached)
- Cutover version: `3877019f-a798-4149-90ae-e0e3d1ae5c64`
- Custom domains: `whoremanh3.com`, `www.whoremanh3.com`
- Canonical hostname: `www.whoremanh3.com`; apex GET/HEAD requests return 301 without losing the path or query string
- Public `workers.dev` and preview URLs: disabled
- Contact delivery: live (`CONTACT_DRY_RUN=false`) through Brevo, protected by server-side managed Turnstile verification

The production gate verified all eight public routes as 200 responses from Cloudflare, all three retired routes as 410, the apex redirect, security headers, the eight-URL sitemap, the real Turnstile token, and Brevo `Sent` plus `Delivered` events for the production message.

## Search-engine consoles

Verified August 10, 2026 after cutover:

- Google Search Console uses the `sc-domain:whoremanh3.com` domain property, which covers the apex and `www`. Live URL tests passed for both hostnames. Google treats the apex as a redirect and selects `https://www.whoremanh3.com/` as canonical.
- Google successfully read `https://www.whoremanh3.com/sitemap.xml` as a sitemap containing 8 pages. No pages were removed from the index.
- Google reported no manual actions or security issues. The canonical homepage was added to Google's priority crawl queue after the migration.
- Bing Webmaster Tools successfully read the same sitemap with 8 discovered URLs, 0 errors, and 0 warnings. The canonical homepage was submitted for recrawling.
- Bing's live `www` inspection found no SEO/GEO issues. Its apex live inspection reported duplicate metadata while following the redirect, but the raw production chain proves the apex is a bodyless 301 and the resulting `www` document has exactly one description and one canonical tag. Treat this apex-only warning as analyzer noise unless Bing reproduces it on the canonical `www` URL.
- Bing Site Scan could not be started because the account showed a remaining scan quota of 0 pages. The sitemap and individual live inspections completed successfully despite that separate quota.

## Deploy

```powershell
npm ci
npm run lint
npm test
npm audit
npm run deploy
```

After deployment, verify every route, `robots.txt`, `sitemap.xml`, the three 410 paths, the apex redirect, and one uniquely labeled contact message in Brevo's transactional log.

## Recovery

Cloudflare keeps Worker deployment versions that can be rolled back from the dashboard. For a source-based recovery, check out the last known-good commit, run `npm run check`, deploy it with `npm run deploy`, and repeat the production verification above. Do not alter MX, TXT, DKIM, mail, verification, or other non-web DNS records during a web rollback.

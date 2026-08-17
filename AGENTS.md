# WhoremanH3 public-site guidance

- Treat the current static build as the production visual and editorial specification. Do not rewrite visible copy unless the user explicitly asks.
- Build only the public `www.whoremanh3.com` site in this repository.
- Preserve these public routes: `/`, `/events-trails/`, `/information/`, `/faq/`, `/utah-kennels/`, `/hash-history/`, `/contact-us/`, and `/haberdashery/`.
- Keep FAQ as a separate page nested beneath What’s Hashing in navigation. Do not add Home to the primary menu.
- Retire `/blog/`, `/events/`, and `/SLUTHashPrimer.pdf`; do not include them in navigation or the sitemap.
- Keep generated pages self-contained and free of external CMS dependencies.
- Keep both production custom domains in Wrangler configuration, with apex canonicalizing to `www`; do not re-enable the public `workers.dev` preview.
- Keep contact secrets in Worker secrets. Production uses the dedicated managed Turnstile widget and Brevo API key with `CONTACT_DRY_RUN=false`.
- Before handoff, run `npm run check` and desktop/mobile browser QA.

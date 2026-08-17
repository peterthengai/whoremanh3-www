import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pages } from "../src/pages.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const canonicalBase = "https://www.whoremanh3.com";
const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY || "0x4AAAAAAEMPRl9CgaSI8uPi";
const stylesheet = await readFile(join(root, "src", "site.css"));
const script = await readFile(join(root, "src", "site.js"));
const stylesheetName = `site.${createHash("sha256").update(stylesheet).digest("hex").slice(0, 12)}.css`;
const scriptName = `site.${createHash("sha256").update(script).digest("hex").slice(0, 12)}.js`;

const navItems = [
  { label: "Trails and Events", slug: "events-trails" },
  { label: "What’s Hashing?", slug: "information", children: [{ label: "FAQs", slug: "faq" }] },
  { label: "Utah Kennels", slug: "utah-kennels" },
  { label: "Hash History", slug: "hash-history" },
  { label: "Contact Us", slug: "contact-us" },
  { label: "Haberdashery", slug: "haberdashery" }
];

const escapeHtml = (value) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

function renderNav(currentSlug) {
  return navItems.map((item) => {
    const active = currentSlug === item.slug || item.children?.some((child) => child.slug === currentSlug);
    const children = item.children ? `
      <button class="submenu-toggle" type="button" aria-expanded="false" aria-label="Show FAQs">▾</button>
      <ul class="submenu">${item.children.map((child) => `<li><a${currentSlug === child.slug ? ' aria-current="page"' : ""} href="/${child.slug}/">${child.label}</a></li>`).join("")}</ul>` : "";
    return `<li class="nav-item${item.children ? " has-submenu" : ""}${active ? " active" : ""}"><a${currentSlug === item.slug ? ' aria-current="page"' : ""} href="/${item.slug}/">${item.label}</a>${children}</li>`;
  }).join("\n");
}

function renderPage(page, body) {
  const path = page.slug ? `/${page.slug}/` : "/";
  const canonical = canonicalBase + path;
  const heading = page.pageTitle ? `<div class="page-title"><h1>${page.pageTitle}</h1></div>` : "";
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${canonicalBase}/#organization`,
        name: "Whoreman Hash House Harriers",
        url: `${canonicalBase}/`,
        logo: `${canonicalBase}/assets/images/utah-kennels.jpg`,
        sameAs: ["https://www.facebook.com/groups/UtahH3"]
      },
      {
        "@type": "WebSite",
        "@id": `${canonicalBase}/#website`,
        url: `${canonicalBase}/`,
        name: "Whoreman Hash House Harriers",
        publisher: { "@id": `${canonicalBase}/#organization` }
      },
      {
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        url: canonical,
        name: page.title,
        description: page.description,
        isPartOf: { "@id": `${canonicalBase}/#website` }
      }
    ]
  };

  return `<!doctype html>
<html lang="en-US">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${page.robots ? `<meta name="robots" content="${page.robots}">` : ""}
  <title>${escapeHtml(page.title)}</title>
  <meta name="description" content="${escapeHtml(page.description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Whoreman Hash House Harriers">
  <meta property="og:title" content="${escapeHtml(page.title)}">
  <meta property="og:description" content="${escapeHtml(page.description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${canonicalBase}/assets/images/utah-kennels.jpg">
  <meta property="og:image:alt" content="Logos of Utah’s Hash House Harriers kennels">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="/assets/${stylesheetName}">
  <script type="application/ld+json">${JSON.stringify(structuredData).replaceAll("<", "\\u003c")}</script>
  <script src="/assets/${scriptName}" defer></script>
</head>
<body class="${page.bodyClass ?? ""}">
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="site-branding"><a href="/">Whoreman Hash House Harriers</a></div>
    <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-menu"><span></span><span></span><span></span><span class="screen-reader-text">Toggle navigation</span></button>
    <nav class="primary-navigation" aria-label="Primary navigation">
      <ul id="primary-menu">${renderNav(page.slug)}</ul>
    </nav>
    ${heading}
  </header>
  <main id="main">${body}</main>
  <footer class="site-footer">
    <a class="facebook-link" href="https://facebook.com/groups/UtahH3" aria-label="Utah H3 on Facebook" rel="noopener noreferrer"><span aria-hidden="true">f</span></a>
  </footer>
</body>
</html>`;
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(root, "public", "assets"), join(dist, "assets"), { recursive: true });
await writeFile(join(dist, "assets", stylesheetName), stylesheet);
await writeFile(join(dist, "assets", scriptName), script);

for (const page of pages) {
  const body = (await readFile(join(root, "src", "content", `${page.file}.html`), "utf8"))
    .replaceAll("__TURNSTILE_SITE_KEY__", turnstileSiteKey);
  const destination = page.slug ? join(dist, page.slug, "index.html") : join(dist, "index.html");
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, renderPage(page, body), "utf8");
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((page) => `  <url><loc>${canonicalBase}${page.slug ? `/${page.slug}/` : "/"}</loc></url>`).join("\n")}
</urlset>\n`;
await writeFile(join(dist, "sitemap.xml"), sitemap, "utf8");
await writeFile(join(dist, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${canonicalBase}/sitemap.xml\n`, "utf8");
await writeFile(join(dist, "404.html"), renderPage({
  slug: "404",
  title: "Page Not Found - Whoreman Hash House Harriers",
  pageTitle: "Page Not Found",
  description: "That trail mark does not lead anywhere.",
  robots: "noindex"
}, `<section class="narrow-page not-found"><h2>That trail went false.</h2><p>The page you were looking for could not be found.</p><p><a class="button" href="/events-trails/">Find a Trail or Event</a></p></section>`), "utf8");

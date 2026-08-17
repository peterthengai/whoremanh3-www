const recentSubmissions = new Map();
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 5;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (url.hostname === "whoremanh3.com" && (request.method === "GET" || request.method === "HEAD")) {
      url.hostname = "www.whoremanh3.com";
      return withSecurityHeaders(Response.redirect(url, 301));
    }

    if (isRetiredPath(path)) {
      return withSecurityHeaders(new Response(retiredPage(), {
        status: 410,
        headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=3600" }
      }));
    }

    if (path === "/api/contact") {
      return withSecurityHeaders(await handleContact(request, env, url));
    }

    const response = await env.ASSETS.fetch(request);
    return withSecurityHeaders(response);
  }
};

function isRetiredPath(path) {
  const lower = path.toLowerCase();
  return lower === "/blog" || lower.startsWith("/blog/") ||
    lower === "/events" || lower.startsWith("/events/") ||
    lower === "/sluthashprimer.pdf";
}

async function handleContact(request, env, url) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405, { Allow: "POST" });
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return json({ error: "Invalid request origin." }, 403);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 20_000) return json({ error: "Message is too large." }, 413);

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (!withinRateLimit(ip)) return json({ error: "Too many messages. Please try again later." }, 429);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid form submission." }, 400);
  }

  if (payload.website) return json({ ok: true }, 202);

  const firstName = clean(payload.firstName, 80);
  const lastName = clean(payload.lastName, 80);
  const email = clean(payload.email, 254);
  const message = clean(payload.message, 5000);
  const token = clean(payload["cf-turnstile-response"], 2048);

  if (!firstName || !email || !message) return json({ error: "Name, email, and message are required." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
  if (!token) return json({ error: "Complete the anti-spam check." }, 400);

  const turnstileValid = await verifyTurnstile(token, ip, env.TURNSTILE_SECRET, url.hostname, env.CONTACT_DRY_RUN === "true");
  if (!turnstileValid) return json({ error: "The anti-spam check failed. Please try again." }, 400);

  if (env.CONTACT_DRY_RUN === "true") return json({ ok: true, dryRun: true });
  if (!env.BREVO_API_KEY) return json({ error: "The contact form is temporarily unavailable." }, 503);

  const fullName = `${firstName} ${lastName}`.trim();
  const sent = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": env.BREVO_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sender: { name: "Whoreman H3 Website", email: env.CONTACT_FROM },
      to: [{ email: env.CONTACT_TO }],
      replyTo: { name: fullName, email },
      subject: `Website message from ${fullName}`,
      textContent: `Name: ${fullName}\nEmail: ${email}\n\n${message}`,
      htmlContent: `<p><strong>Name:</strong> ${escapeHtml(fullName)}<br><strong>Email:</strong> ${escapeHtml(email)}</p><p>${escapeHtml(message).replaceAll("\n", "<br>")}</p>`
    })
  });

  if (!sent.ok) return json({ error: "The message could not be sent right now." }, 502);
  return json({ ok: true });
}

async function verifyTurnstile(token, ip, secret, hostname, dryRun) {
  if (!secret) return false;
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip !== "unknown") form.append("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  if (!response.ok) return false;
  const result = await response.json();
  if (result.success !== true) return false;
  if (dryRun) return true;
  return result.action === "contact" && ["www.whoremanh3.com", "whoremanh3.com"].includes(result.hostname) && ["www.whoremanh3.com", "whoremanh3.com"].includes(hostname);
}

function withinRateLimit(ip) {
  const now = Date.now();
  if (recentSubmissions.size > 1000) {
    for (const [key, value] of recentSubmissions) {
      if (now - value.started > RATE_WINDOW_MS) recentSubmissions.delete(key);
    }
  }
  const record = recentSubmissions.get(ip);
  if (!record || now - record.started > RATE_WINDOW_MS) {
    recentSubmissions.set(ip, { started: now, count: 1 });
    return true;
  }
  record.count += 1;
  return record.count <= RATE_LIMIT;
}

function clean(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
  });
}

async function withSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  const contentType = headers.get("content-type") || "";
  let body = response.body;
  let structuredDataHash = "";
  if (contentType.includes("text/html")) {
    const html = await response.text();
    const structuredData = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    if (structuredData) {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(structuredData));
      const encoded = btoa(String.fromCharCode(...new Uint8Array(digest)));
      structuredDataHash = ` 'sha256-${encoded}'`;
    }
    body = html;
  }
  headers.set("content-security-policy", `default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self' https://challenges.cloudflare.com${structuredDataHash}; frame-src https://calendar.google.com https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'`);
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("x-content-type-options", "nosniff");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  headers.set("strict-transport-security", "max-age=31536000; includeSubDomains");
  if (contentType.includes("text/html")) headers.set("cache-control", "public, max-age=0, must-revalidate");
  if (/\.(?:css|js|woff2?|jpg|jpeg|png|webp|svg)$/i.test(new URL(response.url || "https://local.invalid/").pathname)) {
    headers.set("cache-control", "public, max-age=31536000, immutable");
  }
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

function retiredPage() {
  return `<!doctype html><html lang="en-US"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Page Retired - Whoreman Hash House Harriers</title></head><body><main><h1>Page retired</h1><p>This page is no longer part of the site.</p><p><a href="/">Return to Whoreman H3</a></p></main></body></html>`;
}

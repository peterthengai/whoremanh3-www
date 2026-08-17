import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import worker from "../src/worker.js";
import { pages } from "../src/pages.mjs";

const root = new URL("..", import.meta.url).pathname.replace(/^\/(.:)/, "$1");

async function builtPage(slug) {
  return readFile(join(root, "dist", slug, "index.html"), "utf8");
}

test("build emits the eight public pages with one metadata set", async () => {
  for (const page of pages) {
    const html = await builtPage(page.slug);
    assert.equal((html.match(/<title>/g) || []).length, 1, page.slug);
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1, page.slug);
    assert.equal((html.match(/name="description"/g) || []).length, 1, page.slug);
    assert.equal((html.match(/property="og:title"/g) || []).length, 1, page.slug);
  }
});

test("primary navigation omits Home and keeps FAQ beneath What's Hashing", async () => {
  const html = await builtPage("");
  const menu = html.match(/<nav class="primary-navigation"[\s\S]*?<\/nav>/)?.[0] || "";
  assert.doesNotMatch(menu, />Home</);
  const order = ["Trails and Events", "What’s Hashing?", "FAQs", "Utah Kennels", "Hash History", "Contact Us", "Haberdashery"];
  let position = -1;
  for (const label of order) {
    const next = menu.indexOf(label);
    assert.ok(next > position, `${label} is out of order`);
    position = next;
  }
});

test("latest wording corrections are preserved", async () => {
  const events = await builtPage("events-trails");
  const info = await builtPage("information");
  const faq = await builtPage("faq");
  const kennels = await builtPage("utah-kennels");
  const history = await builtPage("hash-history");
  const home = await builtPage("");
  assert.match(events, /Walking and running:<\/strong> Both are welcome/);
  assert.match(events, /virgins \(first-time hashers\) hash free! BYOB is just \$1/);
  assert.match(info, /Hares off is about 15 minutes later, and pack off is about 15 minutes after that/);
  assert.match(faq, /It does not necessarily mean the route was a false trail/);
  assert.match(faq, /YBF<\/dt><dd>“You’ve Been Fucked”/);
  assert.match(kennels, /Frequency:<\/strong> Monthly on Sundays/);
  assert.match(history, /Betty Ford Rehab Hash/);
  assert.doesNotMatch(home, /Who We Are/i);
  assert.doesNotMatch(home, /Learn More/i);
});

test("retired paths return 410 without affecting the current events page", async () => {
  const env = { ASSETS: { fetch: async () => new Response("asset", { status: 200 }) } };
  for (const path of ["/blog/", "/events/", "/SLUTHashPrimer.pdf"]) {
    const response = await worker.fetch(new Request(`https://preview.example${path}`), env);
    assert.equal(response.status, 410, path);
  }
  const current = await worker.fetch(new Request("https://preview.example/events-trails/"), env);
  assert.equal(current.status, 200);
});

test("apex requests redirect to the canonical www hostname without losing path or query", async () => {
  const env = { ASSETS: { fetch: async () => new Response("asset", { status: 200 }) } };
  const response = await worker.fetch(new Request("https://whoremanh3.com/hash-history/?from=apex"), env);
  assert.equal(response.status, 301);
  assert.equal(response.headers.get("location"), "https://www.whoremanh3.com/hash-history/?from=apex");
});

test("contact endpoint rejects non-POST and incomplete submissions", async () => {
  const env = { ASSETS: { fetch: async () => new Response("asset") } };
  const getResponse = await worker.fetch(new Request("https://preview.example/api/contact"), env);
  assert.equal(getResponse.status, 405);
  const postResponse = await worker.fetch(new Request("https://preview.example/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://preview.example" },
    body: JSON.stringify({ firstName: "Just Test" })
  }), env);
  assert.equal(postResponse.status, 400);
});

test("contact page uses the managed production Turnstile widget", async () => {
  const contact = await builtPage("contact-us");
  assert.match(contact, /data-sitekey="0x4AAAAAAEMPRl9CgaSI8uPi"/);
  assert.match(contact, /data-action="contact"/);
  assert.doesNotMatch(contact, /1x00000000000000000000AA/);
});

test("built HTML has image alternatives and resolvable internal assets", async () => {
  for (const page of pages) {
    const html = await builtPage(page.slug);
    for (const tag of html.match(/<img\b[^>]*>/g) || []) assert.match(tag, /\balt="[^"]*"/, `${page.slug}: ${tag}`);
    for (const asset of html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) {
      await assert.doesNotReject(access(join(root, "dist", asset[1])), `${page.slug}: ${asset[1]}`);
    }
  }
});

test("404 output is noindex and the sitemap contains only approved pages", async () => {
  const notFound = await readFile(join(root, "dist", "404.html"), "utf8");
  const sitemap = await readFile(join(root, "dist", "sitemap.xml"), "utf8");
  assert.match(notFound, /name="robots" content="noindex"/);
  assert.equal((sitemap.match(/<url>/g) || []).length, 8);
  assert.doesNotMatch(sitemap, /blog|SLUTHashPrimer|\/events\//);
});

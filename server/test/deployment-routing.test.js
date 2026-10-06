import { test } from "node:test";
import assert from "node:assert/strict";
import { vercelConfig } from "../../scripts/configure-vercel.js";

test("Vercel routes API traffic before SPA fallback and disables API caching", async () => {
  const config = await vercelConfig("https://getclaim-api.onrender.com/");
  assert.equal(config.rewrites[0].destination, "https://getclaim-api.onrender.com/api/:path*");
  assert.equal(config.outputDirectory, "client/dist");
  assert.match(config.rewrites[1].source, /\?!api/);
  assert.ok(config.headers.some(rule => rule.source === "/api/:path*" && rule.headers.some(h => h.key === "Cache-Control" && h.value.includes("no-store"))));
  assert.ok(!JSON.stringify(config).includes("__RENDER_API_ORIGIN__"));
});

test("deployment refuses local, insecure or credential-bearing API destinations", async () => {
  for (const origin of [undefined, "http://api.onrender.com", "https://localhost", "https://127.0.0.1", "https://user:secret@api.onrender.com", "https://api.onrender.com/api", "https://api.onrender.com/?key=value", "https://api.invalid"])
    await assert.rejects(vercelConfig(origin));
});

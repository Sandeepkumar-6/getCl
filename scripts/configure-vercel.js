import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function vercelConfig(apiOrigin) {
  let origin;
  try { origin = new URL(apiOrigin); } catch { throw new Error("Provide the deployed Render API HTTPS origin."); }
  if (origin.protocol !== "https:" || origin.pathname !== "/" || origin.search || origin.hash || origin.username || origin.password || !origin.hostname.includes(".") || /(^|\.)(localhost|example|invalid|test)$/.test(origin.hostname) || /^\d[\d.]+$/.test(origin.hostname))
    throw new Error("Use a public HTTPS origin without a path, credentials, query, or fragment.");
  const template = await fs.readFile(new URL("../deploy/vercel.template.json", import.meta.url), "utf8");
  return JSON.parse(template.replaceAll("__RENDER_API_ORIGIN__", origin.origin));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const config = await vercelConfig(process.argv[2]);
    await fs.writeFile(new URL("../vercel.json", import.meta.url), JSON.stringify(config, null, 2) + "\n");
    console.log("Vercel configuration saved with the deployed API origin.");
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}

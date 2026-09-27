// Asset build step. Pass the path to an installed sharp package as argv[2].
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const sharp = require(process.argv[2] || "sharp");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "client/public/assets");
for (const directory of ["brand", "hero", "vehicles", "claims"]) await mkdir(path.join(output, directory), { recursive: true });
if (process.argv[3]) {
  await sharp(process.argv[3]).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 83 }).toFile(path.join(output, "hero/hero-road-india.webp"));
}
const mark = await sharp(path.join(root, "client/src/assets/getclaim-mark-v2.png")).trim().resize({ width: 192 }).png().toBuffer();
await writeFile(path.join(output, "brand/getclaim-mark.png"), mark);
const embedded = `data:image/png;base64,${mark.toString("base64")}`;
// SVG containers preserve the approved raster emblem; wordmarks are SVG text.
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><image href="${embedded}" x="3" y="1" width="58" height="62"/></svg>`;
await writeFile(path.join(output, "brand/getclaim-mark.svg"), markSvg);
await writeFile(path.join(output, "claims/getclaim-icon.svg"), markSvg);
for (const [theme, foreground, accent] of [["dark", "#142b3d", "#158477"], ["light", "#ffffff", "#8fd7c5"]]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 270 64"><image href="${embedded}" x="0" y="1" width="56" height="62"/><text x="67" y="38" font-family="Segoe UI,Arial,sans-serif" font-size="32" font-weight="750" letter-spacing="-1.6" fill="${foreground}">get<tspan fill="${accent}">Claim</tspan></text><text x="68" y="53" font-family="Segoe UI,Arial,sans-serif" font-size="6.7" font-weight="700" letter-spacing=".65" fill="${foreground}">SAFER ROADS. BRIGHTER JOURNEYS.</text></svg>`;
  await writeFile(path.join(output, `brand/getclaim-logo-${theme}.svg`), svg);
}
for (const name of ["tata-nexon", "maruti-baleno", "hyundai-creta", "honda-amaze"]) {
  await sharp(path.join(root, `client/src/assets/vehicles/${name}-v1.png`)).resize({ width: 640 }).webp({ quality: 82 }).toFile(path.join(output, `vehicles/${name}.webp`));
}
console.log("Prepared optimized local landing and brand assets.");

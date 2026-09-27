import fs from "node:fs";
import crypto from "node:crypto";
if (!fs.existsSync("server/.env")) {
  fs.writeFileSync(
    "server/.env",
    `PORT=5000\nMONGO_URI=mongodb://127.0.0.1:27017/getclaim_db\nJWT_SECRET=${crypto.randomBytes(48).toString("hex")}\nCLIENT_URL=http://localhost:5173\nNODE_ENV=development\nTRUST_PROXY_HOPS=0\nEMAIL_TRANSPORT=console\nSMS_TRANSPORT=console\nSTORAGE_DRIVER=local\n`,
  );
  console.log("Created local server/.env with a random secret.");
}

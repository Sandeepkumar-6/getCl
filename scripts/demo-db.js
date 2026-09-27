import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
await fs.mkdir(".local/mongo", { recursive: true });
let executable = process.env.MONGOD_PATH || "mongod";
if (process.platform === "win32" && !process.env.MONGOD_PATH) {
  const root = "C:/Program Files/MongoDB/Server";
  try {
    const versions = (await fs.readdir(root)).sort((a, b) =>
      b.localeCompare(a, undefined, { numeric: true }),
    );
    for (const version of versions) {
      const candidate = path.join(root, version, "bin/mongod.exe");
      try {
        await fs.access(candidate);
        executable = candidate;
        break;
      } catch {}
    }
  } catch {}
}
const db = spawn(
  executable,
  [
    "--dbpath",
    path.resolve(".local/mongo"),
    "--bind_ip",
    "127.0.0.1",
    "--port",
    "27017",
    "--logpath",
    path.resolve(".local/mongo.log"),
  ],
  { stdio: "inherit", windowsHide: true },
);
db.on("spawn", () =>
  console.log(
    "Starting local MongoDB at 127.0.0.1:27017 with workspace storage. Keep this terminal open. Logs: .local/mongo.log",
  ),
);
db.on("error", (e) => {
  console.error(
    "Install MongoDB Community Server or set MONGOD_PATH to your mongod executable.",
    e.message,
  );
  process.exitCode = 1;
});
db.on("exit", (code) => {
  process.exitCode = code || 0;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => db.kill(signal));

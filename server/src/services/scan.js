import net from "node:net";

// ClamAV's INSTREAM protocol keeps untrusted files out of the document store.
export async function scanUpload(buffer) {
  const host = process.env.CLAMAV_HOST;
  if (!host) {
    if (process.env.NODE_ENV === "production") throw Object.assign(new Error("Upload scanning is unavailable."), { status: 503 });
    return;
  }
  const port = Number(process.env.CLAMAV_PORT || 3310);
  try {
    const response = await new Promise((resolve, reject) => {
      const socket = net.createConnection({ host, port });
      let reply = "";
      let complete = false;
      socket.setTimeout(15000, () => socket.destroy(new Error("Scanner timed out.")));
      socket.on("connect", () => {
        socket.write("zINSTREAM\0");
        for (let offset = 0; offset < buffer.length; offset += 64 * 1024) {
          const chunk = buffer.subarray(offset, offset + 64 * 1024);
          const size = Buffer.alloc(4);
          size.writeUInt32BE(chunk.length);
          socket.write(size);
          socket.write(chunk);
        }
        socket.write(Buffer.alloc(4));
      });
      socket.on("data", data => {
        reply += data.toString("utf8");
        if (reply.length > 1024) return socket.destroy(new Error("Scanner response is invalid."));
        if (reply.includes("\0") || reply.includes("\n")) { complete = true; socket.end(); resolve(reply); }
      });
      socket.on("error", reject);
      socket.on("close", () => { if (!complete) reject(new Error("Scanner closed without a complete response.")); });
    });
    if (/\bFOUND\b/.test(response)) throw Object.assign(new Error("This file failed the security scan."), { status: 422 });
    if (!/^stream: OK[\0\n]/.test(response)) throw new Error("Scanner did not confirm the file is clean.");
  } catch (error) {
    if (error.status === 422) throw error;
    throw Object.assign(new Error("Upload scanning is unavailable. Try again later."), { status: 503 });
  }
}

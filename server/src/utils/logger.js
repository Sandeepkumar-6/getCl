const write = (level, event, fields = {}) => {
  const entry = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...fields });
  const stream = level === "error" ? process.stderr : process.stdout;
  stream.write(`${entry}\n`);
};

export const logger = {
  info: (event, fields) => write("info", event, fields),
  warn: (event, fields) => write("warn", event, fields),
  error: (event, fields) => write("error", event, fields),
};

export function requestLogger(req, res, next) {
  const startedAt = performance.now();
  res.on("finish", () => {
    if (process.env.NODE_ENV === "test") return;
    logger.info("http_request", {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl.split("?")[0],
      status: res.statusCode,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      actorId: req.user?._id ? String(req.user._id) : undefined,
    });
  });
  next();
}


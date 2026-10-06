import crypto from "node:crypto";
import jwt from "jsonwebtoken";

const production = () => process.env.NODE_ENV === "production";
const sessionName = () => production() ? "__Host-getclaim-session" : "getclaim-session";
const csrfName = () => production() ? "__Host-getclaim-csrf" : "getclaim-csrf";
const age = 8 * 60 * 60;

export function cookies(req) {
  return Object.fromEntries((req.headers.cookie || "").split(";").map(part => {
    const index = part.indexOf("=");
    return index < 0 ? [] : [part.slice(0, index).trim(), part.slice(index + 1).trim()];
  }).filter(part => part.length === 2));
}

const cookie = (name, value, { httpOnly = false, maxAge = age } = {}) =>
  `${name}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Strict${httpOnly ? "; HttpOnly" : ""}${production() ? "; Secure" : ""}`;

export function issueSession(res, user) {
  const csrf = crypto.randomBytes(32).toString("hex");
  const token = jwt.sign({ id: user._id, v: user.authVersion || 0, jti: crypto.randomUUID(), csrf: crypto.createHash("sha256").update(csrf).digest("hex") }, process.env.JWT_SECRET, { algorithm: "HS256", expiresIn: "8h" });
  res.append("Set-Cookie", cookie(sessionName(), token, { httpOnly: true }));
  res.append("Set-Cookie", cookie(csrfName(), csrf));
  // Existing API tests use bearer tokens. Production never exposes them to JavaScript.
  return process.env.NODE_ENV === "test" ? token : undefined;
}

export function clearSession(res) {
  res.append("Set-Cookie", cookie(sessionName(), "", { httpOnly: true, maxAge: 0 }));
  res.append("Set-Cookie", cookie(csrfName(), "", { maxAge: 0 }));
}

export function readSession(req) {
  const jar = cookies(req);
  const fromCookie = jar[sessionName()];
  const bearer = process.env.NODE_ENV === "test" ? req.headers.authorization?.match(/^Bearer (.+)$/)?.[1] : undefined;
  return { token: fromCookie || bearer, fromCookie: Boolean(fromCookie), csrf: jar[csrfName()] };
}

export function validCsrf(req, decoded, submitted, csrf) {
  if (!submitted || !csrf || !decoded.csrf || !/^[a-f0-9]{64}$/.test(submitted) || submitted !== csrf) return false;
  const hash = crypto.createHash("sha256").update(submitted).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(decoded.csrf));
}

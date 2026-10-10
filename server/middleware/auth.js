import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { AUTH_CODES } from "../../shared/authCodes.js";
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || null;

// Fail closed on auth, but never at module load — throwing here would crash the
// whole serverless function and take every route (including public ones) with it.
//
// There is deliberately NO development fallback. One used to live here, gated
// on NODE_ENV: a literal committed to a public repository, which became the
// live signing key on any deployment where NODE_ENV was not "production" —
// and anyone reading the repo could then mint an ADMIN token. A secret that
// has a default is not a secret. Development sets JWT_SECRET like everywhere
// else; `openssl rand -base64 32` is the whole setup step.
if (!JWT_SECRET) {
  console.error(
    "FATAL: JWT_SECRET is not set. All authentication endpoints will refuse requests until it is configured."
  );
}

/**
 * Middleware: Verify JWT access token.
 * Attaches req.user = { userId, role } on success.
 */
export const verifyJWT = (req, res, next) => {
  if (!JWT_SECRET) {
    return res.status(503).json({
      error: "Authentication is not configured on this server",
      code: AUTH_CODES.AUTH_UNCONFIGURED,
    });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Access token required", code: AUTH_CODES.TOKEN_MISSING });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
    };
    next();
  } catch (err) {
    // This is the ONLY place in the API that may emit TOKEN_EXPIRED, and the
    // only place that verifies a token at all. The client's interceptor keys
    // its silent refresh off this exact code — a route that rejected an expired
    // token by itself, without setting it, would sign the customer out instead
    // of refreshing. New routes must use this middleware rather than calling
    // jwt.verify directly.
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: "Access token expired", code: AUTH_CODES.TOKEN_EXPIRED });
    }
    return res
      .status(401)
      .json({ error: "Invalid access token", code: AUTH_CODES.TOKEN_INVALID });
  }
};

/**
 * Middleware: attach req.user when a valid token is present, but never reject.
 *
 * For endpoints that serve guests and signed-in customers alike and only want
 * to enrich the record when it can. An invalid or expired token is treated the
 * same as no token at all — a stale token in a browser tab must not turn a
 * public page into an error.
 */
export const optionalJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!JWT_SECRET || !authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
    };
  } catch {
    // Deliberately ignored — the request continues as a guest.
  }
  next();
};

/**
 * Middleware: Require ADMIN role (must be used after verifyJWT).
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

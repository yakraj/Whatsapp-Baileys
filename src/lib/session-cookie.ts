/**
 * Edge-safe constant: just the cookie name, no Node.js imports.
 * Imported by both middleware.ts (Edge Runtime) and session.ts (Node.js).
 */
export const SESSION_COOKIE = "gw_session";

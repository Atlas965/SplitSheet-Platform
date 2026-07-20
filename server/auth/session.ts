/**
 * server/auth/session.ts — shared Express session factory for all auth providers.
 */
import session from "express-session";
import connectPg from "connect-pg-simple";

const databaseUrl = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;

export function createSessionMiddleware() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: databaseUrl,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

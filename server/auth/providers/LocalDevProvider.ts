/**
 * LocalDevProvider — wraps LOCAL_DEV=true bypass (Priority 2.1).
 */
import passport from "passport";
import type { Express, Request, Response } from "express";
import type { AuthUserClaims, IAuthProvider } from "../IAuthProvider";
import { createSessionMiddleware } from "../session";
import { upsertUserFromClaims } from "../upsertUser";

const DEV_CLAIMS: AuthUserClaims = {
  sub: "local-dev-operator",
  email: "dev@localhost",
  first_name: "Local",
  last_name: "Operator",
  profile_image_url: null,
  exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
};

export class LocalDevProvider implements IAuthProvider {
  async setup(app: Express): Promise<void> {
    app.set("trust proxy", 1);
    app.use(createSessionMiddleware());
    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser((user: Express.User, cb) => cb(null, user));
    passport.deserializeUser((user: Express.User, cb) => cb(null, user));

    app.get("/api/login", (req, res) => this.initiate(req, res));
    app.get("/api/logout", (req, res) => this.logout(req, res));
  }

  async initiate(req: Request, res: Response): Promise<void> {
    await upsertUserFromClaims(DEV_CLAIMS);
    const user = { claims: DEV_CLAIMS, expires_at: DEV_CLAIMS.exp };
    req.login(user, (err) => {
      if (err) {
        res.status(500).json({ message: "Login failed" });
        return;
      }
      res.redirect("/");
    });
  }

  callback(_req: Request, res: Response): void {
    res.redirect("/");
  }

  logout(req: Request, res: Response): void {
    req.logout(() => res.redirect("/"));
  }

  getUserFromRequest(req: Request): AuthUserClaims | null {
    const user = (req as any).user;
    return user?.claims ?? null;
  }
}

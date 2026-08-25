/**
 * Session login/logout helpers — regenerate after auth, destroy on logout.
 */
import type { Request, Response } from "express";
import { isVercelRuntime } from "./runtime";

function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production" || isVercelRuntime();
}

/** Establish authenticated session with fixation protection. */
export function establishSession(
  req: Request,
  user: Express.User,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = () => {
      req.login(user, (loginErr) => {
        if (loginErr) return reject(loginErr);
        req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
      });
    };

    if (typeof req.session.regenerate !== "function") {
      finish();
      return;
    }

    req.session.regenerate((regenErr) => {
      if (regenErr) return reject(regenErr);
      finish();
    });
  });
}

/** Invalidate Passport user + destroy store session + clear cookie. */
export function destroySession(req: Request, res: Response): Promise<void> {
  return new Promise((resolve) => {
    const clear = () => {
      res.clearCookie("splitsheet.sid", {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: cookieSecure(),
      });
      resolve();
    };

    const destroyStore = () => {
      if (!req.session || typeof req.session.destroy !== "function") {
        clear();
        return;
      }
      req.session.destroy(() => clear());
    };

    if (typeof req.logout === "function") {
      req.logout(() => destroyStore());
    } else {
      destroyStore();
    }
  });
}

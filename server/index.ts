/**
 * Long-running Node entry (local / Docker / Fly).
 * Vercel uses root `server.ts` which exports the Express app instead of listen().
 */
import { getApp } from "./app";
import { log } from "./vite";
import { logger } from "./logger";
import { isVercelRuntime } from "./runtime";

process.on("unhandledRejection", (reason) => {
  logger.error("process.unhandled_rejection", {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: (reason as Error)?.stack,
  });
});

process.on("uncaughtException", (err) => {
  logger.fatal("process.uncaught_exception", {
    message: err.message,
    stack: err.stack,
  });
  // Per Node.js docs, the process is in an undefined state after an
  // uncaught exception — leaving it running (e.g. after a failed port
  // bind) silently zombies the server instead of failing loudly.
  // On Vercel, exiting the isolate is unnecessary and harmful.
  if (!isVercelRuntime()) {
    process.exit(1);
  }
});

const { server } = await getApp();

const port = parseInt(process.env.PORT || "5000", 10);
const listenOptions: { port: number; host: string; reusePort?: boolean } = {
  port,
  host: "0.0.0.0",
};
if (process.platform !== "win32") {
  listenOptions.reusePort = true;
}
server.listen(listenOptions, () => {
  log(`serving on port ${port}`);
});

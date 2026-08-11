import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/** Serve Vite `dist/public` (local/Fly production). Not used on Vercel (outputDirectory). */
export function serveStatic(
  app: Express,
  options: { optional?: boolean } = {},
) {
  const candidates = [
    path.resolve(import.meta.dirname, "public"),
    path.resolve(import.meta.dirname, "..", "dist", "public"),
    path.resolve(process.cwd(), "dist", "public"),
  ];
  const distPath = candidates.find((p) => fs.existsSync(p));

  if (!distPath) {
    const message =
      `Could not find the build directory (tried: ${candidates.join(", ")}). ` +
      "Run `vite build` / `npm run build` first.";
    if (options.optional) {
      console.warn(`[static] ${message}`);
      return;
    }
    throw new Error(message);
  }

  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

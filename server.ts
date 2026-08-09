/**
 * Vercel Express entry — default-export the existing Express application.
 * Local / Docker / Fly continue to use `server/index.ts` + listen().
 *
 * Vercel detects Express only if this file imports `express` directly.
 *
 * @see https://vercel.com/docs/frameworks/backend/express
 */
import express from "express";
import { getApp } from "./server/app";

// Keep the import live so bundlers/detectors do not tree-shake it away.
void express;

const { app } = await getApp();
export default app;

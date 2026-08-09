/**
 * Vercel Express entry — default-export the existing Express application.
 * Local / Docker / Fly continue to use `server/index.ts` + listen().
 *
 * @see https://vercel.com/docs/frameworks/backend/express
 */
import { getApp } from "./server/app";

const { app } = await getApp();
export default app;

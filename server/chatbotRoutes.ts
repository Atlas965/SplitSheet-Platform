/**
 * Legacy /api/chatbot — disabled.
 * Empty-knowledge-base completions were a hallucination risk.
 * Use authenticated /api/copilot (product-grounded) instead.
 */
import type { Express } from "express";
import { isAuthenticated } from "./replitAuth";

export function registerChatbotRoutes(app: Express) {
  app.post("/api/chatbot", isAuthenticated, (_req, res) => {
    res.status(410).json({
      error: "This endpoint is retired. Use POST /api/copilot for product-grounded Copilot answers.",
      code: "chatbot_retired",
      redirect: "/api/copilot",
    });
  });
}

/**
 * Production messaging API — authenticated operator-to-operator chat.
 *
 * Security:
 *  - TLS in transit (HTTPS enforced in production via transport-security.ts)
 *  - AES-256-GCM encryption at rest (message-crypto.ts)
 *  - Session auth on every route
 *  - Rate limiting on send
 *  - Participant authorization on read
 */
import type { Express, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { sanitizeString } from "./security";

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function messageRateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = (req as any).user?.claims?.sub as string | undefined;
    if (!userId) {
      next();
      return;
    }

    const now = Date.now();
    const key = `${userId}:messages`;
    const current = rateLimitStore.get(key);

    if (!current || now > current.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (current.count >= maxRequests) {
      res.status(429).json({
        message: "Too many messages. Please wait before sending more.",
      });
      return;
    }

    current.count++;
    next();
  };
}

const sendMessageSchema = z.object({
  receiverId: z.string().min(1),
  content: z.string().min(1).max(5000),
  messageType: z.enum(["text", "image", "file"]).optional().default("text"),
});

/** Prevent caching of private message payloads in browsers/proxies. */
function noStoreMessages(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  next();
}

export function registerMessageRoutes(app: Express): void {
  app.get(
    "/api/conversations",
    isAuthenticated,
    noStoreMessages,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const conversations = await storage.getUserConversations(userId);
        res.json(conversations);
      } catch (error) {
        console.error("Error getting conversations:", error);
        res.status(500).json({ message: "Failed to get conversations" });
      }
    },
  );

  app.get(
    "/api/conversations/:userId",
    isAuthenticated,
    noStoreMessages,
    async (req: any, res) => {
      try {
        const currentUserId = req.user.claims.sub;
        const otherUserId = req.params.userId;
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

        const partner = await storage.getUser(otherUserId);
        if (!partner) {
          res.status(404).json({ message: "User not found" });
          return;
        }

        const thread = await storage.getConversation(currentUserId, otherUserId, limit);
        res.json(thread.reverse());
      } catch (error) {
        console.error("Error getting conversation:", error);
        res.status(500).json({ message: "Failed to get conversation" });
      }
    },
  );

  app.get(
    "/api/messages/unread-count",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const count = await storage.getUnreadMessageCount(userId);
        res.json({ count });
      } catch (error) {
        console.error("Error getting unread count:", error);
        res.status(500).json({ message: "Failed to get unread count" });
      }
    },
  );

  app.post(
    "/api/messages",
    isAuthenticated,
    noStoreMessages,
    messageRateLimit(30, 60_000),
    async (req: any, res) => {
      try {
        const senderId = req.user.claims.sub;
        const parsed = sendMessageSchema.parse({
          receiverId: req.body.receiverId,
          content: sanitizeString(req.body.content, 5000),
          messageType: req.body.messageType ?? "text",
        });

        if (parsed.receiverId === senderId) {
          res.status(400).json({ message: "Cannot send a message to yourself" });
          return;
        }

        const receiver = await storage.getUser(parsed.receiverId);
        if (!receiver) {
          res.status(404).json({ message: "Recipient not found" });
          return;
        }

        const message = await storage.sendMessage(
          senderId,
          parsed.receiverId,
          parsed.content,
          parsed.messageType,
        );

        const sender = await storage.getUser(senderId);
        await storage.createNotification(
          parsed.receiverId,
          "New Message",
          `${sender?.firstName || "Someone"} sent you a message`,
          "info",
          `/messages/${senderId}`,
        );

        res.status(201).json(message);
      } catch (error) {
        if (error instanceof z.ZodError) {
          res.status(400).json({ message: "Invalid message", errors: error.errors });
          return;
        }
        console.error("Error sending message:", error);
        res.status(500).json({ message: "Failed to send message" });
      }
    },
  );

  app.patch(
    "/api/conversations/:userId/read",
    isAuthenticated,
    async (req: any, res) => {
      try {
        const currentUserId = req.user.claims.sub;
        const senderId = req.params.userId;
        await storage.markMessagesAsRead(currentUserId, senderId);
        res.json({ success: true });
      } catch (error) {
        console.error("Error marking messages as read:", error);
        res.status(500).json({ message: "Failed to mark messages as read" });
      }
    },
  );
}

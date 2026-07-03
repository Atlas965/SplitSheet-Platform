import { Express } from "express";
import OpenAI from "openai";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { promises as fs } from 'fs';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to load the knowledge base
async function loadKnowledgeBase(): Promise<string> {
  try {
    const knowledgeBaseContent = await fs.readFile(
      "/home/ubuntu/splitsheet-platform/chatbot_knowledge_base.md",
      "utf-8"
    );
    return knowledgeBaseContent;
  } catch (error) {
    console.error("Error loading knowledge base:", error);
    return ""; // Return empty string or handle error as appropriate
  }
}

export function registerChatbotRoutes(app: Express) {
  app.post("/api/chatbot", isAuthenticated, async (req: any, res) => {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ message: "OpenAI API key not configured." });
    }

    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ message: "Query is required." });
    }

    try {
      const knowledgeBase = await loadKnowledgeBase();

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are the SoundLedger Co-pilot, an AI assistant for the SplitSheet platform. Your goal is to assist users with onboarding, walkthroughs, and platform guidance based on the provided knowledge base. Be concise, helpful, and directly answer questions using only the information from the knowledge base. If the answer is not in the knowledge base, state that you don't have enough information to answer.

Knowledge Base:\n${knowledgeBase}`,
          },
          { role: "user", content: query },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const botResponse = response.choices[0]?.message?.content || "I'm sorry, I couldn't process that.";
      res.json({ response: botResponse });
    } catch (error) {
      console.error("Error processing chatbot query:", error);
      res.status(500).json({ message: "Error processing your request." });
    }
  });
}
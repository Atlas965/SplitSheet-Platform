import OpenAI from "openai";
import type { Stream } from "openai/streaming";
import type { ChatCompletionChunk } from "openai/resources/chat/completions";

export function getCopilotModel(): string {
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
}

export function isCopilotConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export function createCopilotClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 60_000,
    maxRetries: 1,
  });
}

export async function streamCopilotCompletion(
  systemContent: string,
  messages: { role: "user" | "assistant"; content: string }[],
): Promise<Stream<ChatCompletionChunk>> {
  const openai = createCopilotClient();
  return openai.chat.completions.create({
    model: getCopilotModel(),
    max_tokens: 1200,
    temperature: 0.3,
    stream: true,
    messages: [
      { role: "system", content: systemContent },
      ...messages,
    ],
  });
}

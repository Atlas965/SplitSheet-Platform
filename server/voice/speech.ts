/**
 * Speech recognition provider abstraction.
 * Accepts pre-transcribed text (client STT) or OpenAI Whisper when audio is provided.
 * Swappable without touching rights infrastructure.
 */
import OpenAI, { toFile } from "openai";

export type TranscriptionResult = {
  transcript: string;
  confidence: number;
  provider: "passthrough" | "openai-whisper" | "unavailable";
  language?: string;
};

function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

/** Prefer explicit transcript from client; optionally run Whisper on base64 audio. */
export async function transcribeVoiceInput(input: {
  transcript?: string;
  audioBase64?: string;
  mimeType?: string;
  locale?: string;
}): Promise<TranscriptionResult> {
  if (input.transcript?.trim()) {
    return {
      transcript: input.transcript.trim(),
      confidence: 0.95, // client-provided; still subject to confirmation on consequential actions
      provider: "passthrough",
      language: input.locale || "en-CA",
    };
  }

  if (!input.audioBase64) {
    return { transcript: "", confidence: 0, provider: "unavailable" };
  }

  const openai = getOpenAI();
  if (!openai) {
    return {
      transcript: "",
      confidence: 0,
      provider: "unavailable",
    };
  }

  try {
    const buf = Buffer.from(input.audioBase64, "base64");
    const file = await toFile(buf, "utterance.webm", {
      type: input.mimeType || "audio/webm",
    });
    const result = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: (input.locale || "en").slice(0, 2),
    });
    return {
      transcript: (result.text || "").trim(),
      confidence: 0.8,
      provider: "openai-whisper",
      language: input.locale || "en-CA",
    };
  } catch (err) {
    console.error("[voice/stt] Whisper failed:", err);
    return { transcript: "", confidence: 0, provider: "unavailable" };
  }
}

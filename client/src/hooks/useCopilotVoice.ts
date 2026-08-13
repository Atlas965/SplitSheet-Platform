/**
 * Copilot Voice — browser mic → transcript/audio → /api/copilot/voice/*
 * Confirmation gates stay on the server; UI only proposes Confirm/Cancel.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { readApiJson } from "@/lib/readApiJson";

export type VoiceUiStatus = "idle" | "starting" | "listening" | "processing" | "awaiting_confirm";

export type VoiceTurnUiResult = {
  sessionId: string;
  turnId: string;
  transcript: string;
  responseText: string;
  intent?: string;
  pendingActionId?: string;
  proposedActionSummary?: string;
  confidenceBand?: string;
  legalBoundaryTriggered?: boolean;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: any) => void) | null;
  onerror: ((ev: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function useCopilotVoice(opts: {
  pageContext?: string;
  projectId?: string;
  contractId?: string;
  onTurn?: (result: VoiceTurnUiResult) => void;
  onError?: (message: string) => void;
}) {
  const [status, setStatus] = useState<VoiceUiStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [interim, setInterim] = useState("");
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [voiceReady, setVoiceReady] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const finalTranscriptRef = useRef("");
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    fetch("/api/copilot/voice/health", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) return null;
        return readApiJson(r);
      })
      .then((data) => setVoiceReady(Boolean(data?.status === "ready")))
      .catch(() => setVoiceReady(false));
  }, []);

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionId) return sessionId;
    const res = await fetch("/api/copilot/voice/session", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageContext: optsRef.current.pageContext,
        projectId: optsRef.current.projectId,
        contractId: optsRef.current.contractId,
        locale: navigator.language || "en-CA",
      }),
    });
    const data = await readApiJson<{ sessionId: string }>(res);
    setSessionId(data.sessionId);
    return data.sessionId;
  }, [sessionId]);

  const stopTracks = () => {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  };

  const submitTurn = useCallback(
    async (input: { transcript?: string; audioBase64?: string; mimeType?: string }) => {
      setStatus("processing");
      setInterim("");
      try {
        const sid = await ensureSession();
        const res = await fetch("/api/copilot/voice/turn", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sid,
            transcript: input.transcript,
            audioBase64: input.audioBase64,
            mimeType: input.mimeType,
          }),
        });
        const data = await readApiJson<any>(res);
        const result: VoiceTurnUiResult = {
          sessionId: data.sessionId,
          turnId: data.turnId,
          transcript: data.transcript,
          responseText: data.responseText,
          intent: data.intent,
          pendingActionId: data.pendingActionId,
          proposedActionSummary: data.proposedAction?.summary,
          confidenceBand: data.confidenceBand,
          legalBoundaryTriggered: data.legalBoundaryTriggered,
        };
        if (result.pendingActionId) {
          setPendingActionId(result.pendingActionId);
          setStatus("awaiting_confirm");
        } else {
          setPendingActionId(null);
          setStatus("idle");
        }
        optsRef.current.onTurn?.(result);

        try {
          if ("speechSynthesis" in window && result.responseText) {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(result.responseText.replace(/\*\*/g, ""));
            u.lang = navigator.language || "en-CA";
            u.rate = 1.02;
            window.speechSynthesis.speak(u);
          }
        } catch {
          /* TTS optional */
        }

        return result;
      } catch (e: any) {
        setStatus("idle");
        const msg = e?.message || "Voice processing failed";
        optsRef.current.onError?.(msg);
        throw e;
      }
    },
    [ensureSession],
  );

  const stopListening = useCallback(async () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    const transcript = finalTranscriptRef.current.trim();

    if (recorder && recorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        try {
          recorder.stop();
        } catch {
          resolve();
        }
      });
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      stopTracks();
      if (transcript) {
        await submitTurn({ transcript });
      } else if (blob.size > 0) {
        const audioBase64 = await blobToBase64(blob);
        await submitTurn({ audioBase64, mimeType: blob.type || "audio/webm" });
      } else {
        setStatus("idle");
        optsRef.current.onError?.("No speech detected. Try again.");
      }
      return;
    }

    stopTracks();
    if (transcript) {
      await submitTurn({ transcript });
    } else {
      setStatus("idle");
    }
  }, [submitTurn]);

  const startListening = useCallback(async () => {
    if (status === "listening" || status === "processing" || status === "starting") return;
    setStatus("starting");
    setInterim("");
    finalTranscriptRef.current = "";
    optsRef.current.onError?.("");

    try {
      await ensureSession();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start(250);

      const Ctor = getSpeechRecognitionCtor();
      if (Ctor) {
        const recognition = new Ctor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = navigator.language || "en-CA";
        recognition.onresult = (event: any) => {
          let interimText = "";
          let finalText = finalTranscriptRef.current;
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const piece = event.results[i][0]?.transcript || "";
            if (event.results[i].isFinal) {
              finalText = `${finalText} ${piece}`.trim();
            } else {
              interimText += piece;
            }
          }
          finalTranscriptRef.current = finalText;
          setInterim([finalText, interimText].filter(Boolean).join(" "));
        };
        recognition.onerror = () => {
          /* MediaRecorder still captures audio for Whisper fallback */
        };
        recognition.onend = () => {
          /* user may still be recording until mic click */
        };
        recognitionRef.current = recognition;
        recognition.start();
      }

      setStatus("listening");
    } catch (e: any) {
      stopTracks();
      setStatus("idle");
      const msg =
        e?.name === "NotAllowedError"
          ? "Microphone permission denied. Allow mic access to use Voice CoPilot."
          : e?.message || "Could not access microphone";
      optsRef.current.onError?.(msg);
    }
  }, [ensureSession, status]);

  const toggleListening = useCallback(async () => {
    if (status === "listening") {
      await stopListening();
    } else if (status === "idle" || status === "awaiting_confirm") {
      await startListening();
    }
  }, [status, startListening, stopListening]);

  const confirmPending = useCallback(
    async (decision: "confirmed" | "rejected") => {
      if (!sessionId || !pendingActionId) return null;
      setStatus("processing");
      try {
        const res = await fetch("/api/copilot/voice/confirm", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            pendingActionId,
            decision,
          }),
        });
        const data = await readApiJson<any>(res);
        setPendingActionId(null);
        setStatus("idle");
        const result: VoiceTurnUiResult = {
          sessionId,
          turnId: data.turnId || generateLocalId(),
          transcript: decision === "confirmed" ? "Confirm" : "Cancel",
          responseText: data.responseText || (decision === "rejected" ? "Canceled." : "Confirmed."),
        };
        try {
          if ("speechSynthesis" in window && result.responseText) {
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(
              new SpeechSynthesisUtterance(result.responseText.replace(/\*\*/g, "")),
            );
          }
        } catch {
          /* optional */
        }
        return result;
      } catch (e: any) {
        setStatus("awaiting_confirm");
        optsRef.current.onError?.(e?.message || "Confirmation failed");
        return null;
      }
    },
    [sessionId, pendingActionId],
  );

  const resetSession = useCallback(() => {
    try {
      recognitionRef.current?.abort();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    if (mediaRecorderRef.current?.state === "recording") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    stopTracks();
    window.speechSynthesis?.cancel();
    setSessionId(null);
    setPendingActionId(null);
    setInterim("");
    finalTranscriptRef.current = "";
    setStatus("idle");
  }, []);

  useEffect(() => () => resetSession(), [resetSession]);

  return {
    status,
    interim,
    sessionId,
    pendingActionId,
    voiceReady,
    startListening,
    stopListening,
    toggleListening,
    confirmPending,
    resetSession,
    isBusy: status === "processing" || status === "starting",
    isListening: status === "listening",
  };
}

function generateLocalId(): string {
  return Math.random().toString(36).slice(2, 11);
}

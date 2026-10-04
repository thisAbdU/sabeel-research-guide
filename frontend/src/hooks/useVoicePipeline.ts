"use client";

import * as React from "react";
import { useVoxideVoice, type VoxideStatus } from "@voxide/react";
import { getVoxideClient, fetchVoxideClient } from "@/lib/voxide";
import type { ChatMode } from "@/types/chat";

/** Person 1 UI states — mapped from verified Voxide statuses only. */
export type VoicePhase =
  | "ready"
  | "listening"
  | "processing"
  | "thinking"
  | "responding"
  | "error";

export function mapVoicePhase(status: VoxideStatus): VoicePhase {
  switch (status) {
    case "connecting":
    case "listening":
      return "listening";
    case "executing":
      return "processing";
    case "thinking":
      return "thinking";
    case "speaking":
      return "responding";
    case "error":
      return "error";
    case "idle":
    case "armed":
    default:
      return "ready";
  }
}

type SendThroughChat = (content: string) => Promise<string | null>;

/**
 * Person 2 pipeline: mic → Voxide (STT) → text → existing chat workflow →
 * reply text → Voxide (TTS). Does not claim unverified language packs.
 */
export function useVoicePipeline(options: {
  mode: ChatMode;
  conversationId: string | null;
  sendThroughChat: SendThroughChat;
  userId?: string;
  userEmail?: string;
}) {
  const [client, setClient] = React.useState<ReturnType<typeof getVoxideClient>>(() => getVoxideClient());
  const voice = useVoxideVoice(client);

  React.useEffect(() => {
    if (!client) {
      let cancelled = false;
      void fetchVoxideClient().then((resolved) => {
        if (!cancelled && resolved) {
          setClient(resolved);
        }
      });
      return () => {
        cancelled = true;
      };
    }
  }, [client]);

  const sendRef = React.useRef(options.sendThroughChat);
  sendRef.current = options.sendThroughChat;

  const modeRef = React.useRef(options.mode);
  modeRef.current = options.mode;

  const conversationIdRef = React.useRef(options.conversationId);
  conversationIdRef.current = options.conversationId;

  const [liveTranscript, setLiveTranscript] = React.useState<string>("");

  React.useEffect(() => {
    if (!client) return;

    let cancelled = false;

    // 1. Enable Multilingual Adaptive mode
    client.enableMultilingual({
      mode: "adaptive",
      supported: ["en", "am", "om"],
    });

    // 2. Register askResearchCompanion BEFORE init with global scope
    client.register({
      askResearchCompanion: {
        description:
          "CRITICAL: Always use this tool for EVERY question, topic, statement, or comment from the user in ANY language (Amharic, Afan Oromo, English, etc). Send the user's message to the ScholarXiv pair-researcher backend. When this tool returns { ok: true, reply }, you MUST speak the exact 'reply' text back to the user verbatim in the exact same language (if the reply is in Amharic, speak Amharic; do not translate to English).",
        params: {
          message: {
            type: "string",
            required: true,
            description: "The user's spoken words or query exactly as transcribed in their spoken language.",
          },
        },
        scope: "global",
        handler: async (args: Record<string, unknown>) => {
          const text = String(args.message ?? "").trim();
          if (!text) return { ok: false, error: "Empty message" };

          setLiveTranscript("");
          const reply = await sendRef.current(text);
          if (!reply) return { ok: false, error: "Research companion returned no reply" };

          // Returned fields are spoken by Voxide after the tool call.
          // Strip markdown links, formatting symbols, and URLs so TTS pronounces naturally
          const spokenReply = reply
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // [Title](url) -> Title
            .replace(/[*#_`~]/g, "") // remove formatting symbols
            .replace(/https?:\/\/[^\s\)]+/g, "") // remove bare URLs
            .replace(/\s+/g, " ") // normalize whitespace
            .trim();

          return { ok: true, reply: spokenReply };
        },
      },
    });

    // 3. Explicitly upload manifest so Voxide server registers the action immediately
    try {
      const actions =
        typeof client._getManifestActions === "function"
          ? client._getManifestActions()
          : Array.from(client.actions?.values?.() || []).map((a: any) => ({
              name: a.name,
              description: a.description,
              params: a.params,
              scope: a.scope,
              dangerous: a.dangerous,
            }));

      void fetch(`${client.baseUrl}/api/sdk/manifest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${client.publicKey}`,
        },
        body: JSON.stringify({
          actions,
          stateSchema: [],
        }),
      }).catch((err) => {
        if (!cancelled) console.warn("[voxide] manifest sync error:", err);
      });
    } catch (err) {
      console.warn("[voxide] manifest extract error:", err);
    }

    // 4. Initialize client
    client.init().catch((err: unknown) => {
      if (!cancelled) console.error("[voxide] init failed", err);
    });

    client.setActiveRoute("/chat");
    client.bindState(() => ({
      page: "/chat",
      mode: modeRef.current,
      conversationId: conversationIdRef.current,
    }));

    // 5. Track live transcripts during spoken interaction
    const unsubTranscript = client.on(
      "transcript",
      (msg: { role?: string; text?: string; partial?: boolean }) => {
        if (msg?.role === "user" && msg.text) {
          setLiveTranscript(msg.text);
        }
      }
    );

    const unsubMsg = client.on(
      "message",
      (msg: { role?: string; text?: string }) => {
        if (msg?.role === "user" && msg.text) {
          setLiveTranscript(msg.text);
        } else if (msg?.role === "ai") {
          setLiveTranscript("");
        }
      }
    );

    return () => {
      cancelled = true;
      unsubTranscript?.();
      unsubMsg?.();
      client.unregister("askResearchCompanion");
    };
  }, [client]);

  React.useEffect(() => {
    if (!client || !options.userId) return;
    client.setUser({
      userId: options.userId,
      email: options.userEmail,
    });
  }, [client, options.userId, options.userEmail]);

  const phase = mapVoicePhase(voice.status);
  const [sessionActive, setSessionActive] = React.useState(false);

  React.useEffect(() => {
    if (
      voice.status === "connecting" ||
      voice.status === "listening" ||
      voice.status === "executing" ||
      voice.status === "thinking" ||
      voice.status === "speaking"
    ) {
      setSessionActive(true);
    } else if (voice.status === "idle") {
      setSessionActive(false);
    }
  }, [voice.status]);

  const isSessionOpen = sessionActive || (voice.status !== "idle" && voice.status !== "armed");

  const disconnect = React.useCallback(() => {
    setSessionActive(false);
    voice.disconnect();
  }, [voice]);

  const connect = React.useCallback(async () => {
    setSessionActive(true);
    await voice.connect();
  }, [voice]);

  const toggle = React.useCallback(async () => {
    if (!client) return;
    if (isSessionOpen) {
      disconnect();
      return;
    }
    await connect();
  }, [client, isSessionOpen, disconnect, connect]);

  const interrupt = React.useCallback(() => {
    voice.interrupt();
  }, [voice]);

  const getInputLevel = React.useCallback(() => {
    return typeof voice.getInputLevel === "function" ? voice.getInputLevel() : 0;
  }, [voice]);

  const getOutputLevel = React.useCallback(() => {
    return typeof voice.getOutputLevel === "function" ? voice.getOutputLevel() : 0;
  }, [voice]);

  return {
    available: Boolean(client),
    status: voice.status,
    phase,
    liveTranscript,
    currentAction: voice.currentAction,
    errorCode: voice.errorCode,
    isSessionOpen,
    connect,
    disconnect,
    interrupt,
    getInputLevel,
    getOutputLevel,
    toggle,
  };
}

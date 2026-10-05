"use client";

import * as React from "react";
import { useVoxideVoice, type VoxideClient, type VoxideStatus } from "@voxide/react";
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

/** Grace period after TTS so speaker bleed doesn't get transcribed as the user. */
const MIC_UNMUTE_GRACE_MS = 450;

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

/**
 * Half-duplex mic gate. Voxide keeps sending audio_input while TTS plays;
 * laptop speaker bleed then barge-ins and re-transcribes the assistant.
 * Muting tracks sends silence over the WS instead.
 */
function setMicCaptureEnabled(client: VoxideClient | null, enabled: boolean) {
  const mic = (client as { _voiceMic?: MediaStream | null } | null)?._voiceMic;
  if (!mic) return;
  for (const track of mic.getAudioTracks()) {
    track.enabled = enabled;
  }
}

type SendThroughChat = (content: string) => Promise<string | null>;

/**
 * Person 2 pipeline: mic → Voxide (STT) → text → existing chat workflow →
 * reply text → Voxide (TTS). Does not claim unverified language packs.
 *
 * Half-duplex while the assistant is working/speaking (ChatGPT-style):
 * mic off until TTS finishes or the user interrupts.
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

  /** True from tool start until TTS ends / interrupt — blocks echo tool loops. */
  const assistantBusyRef = React.useRef(false);
  const unmuteTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const [liveTranscript, setLiveTranscript] = React.useState<string>("");
  const [transcriptRole, setTranscriptRole] = React.useState<"user" | "ai" | null>(null);

  const clearUnmuteTimer = React.useCallback(() => {
    if (unmuteTimerRef.current) {
      clearTimeout(unmuteTimerRef.current);
      unmuteTimerRef.current = null;
    }
  }, []);

  const muteMic = React.useCallback(() => {
    clearUnmuteTimer();
    setMicCaptureEnabled(client, false);
  }, [client, clearUnmuteTimer]);

  const unmuteMic = React.useCallback(
    (immediate = false) => {
      clearUnmuteTimer();
      if (immediate) {
        setMicCaptureEnabled(client, true);
        return;
      }
      unmuteTimerRef.current = setTimeout(() => {
        unmuteTimerRef.current = null;
        setMicCaptureEnabled(client, true);
      }, MIC_UNMUTE_GRACE_MS);
    },
    [client, clearUnmuteTimer]
  );

  React.useEffect(() => {
    if (!client) return;

    let cancelled = false;

    // 1. Enable Multilingual Adaptive mode
    client.enableMultilingual({
      mode: "adaptive",
      supported: ["en", "am", "om"],
    });

    // Drop echo-triggered tool calls while the assistant turn is in flight.
    // Register once per client instance (effect may re-run; middlewares aren't removable).
    const gated = client as VoxideClient & { __echoGate?: boolean };
    if (!gated.__echoGate) {
      gated.__echoGate = true;
      client.use((ctx, next, cancel) => {
        if (ctx.name === "askResearchCompanion" && assistantBusyRef.current) {
          cancel();
          return;
        }
        return next();
      });
    }

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
          if (assistantBusyRef.current) {
            return { ok: false, error: "Assistant is still responding" };
          }

          // Lock mic immediately so speaker bleed can't barge-in mid-reply.
          assistantBusyRef.current = true;
          muteMic();
          setLiveTranscript(text);
          setTranscriptRole("user");

          const reply = await sendRef.current(text);
          if (!reply) {
            assistantBusyRef.current = false;
            unmuteMic(true);
            return { ok: false, error: "Research companion returned no reply" };
          }

          // Returned fields are spoken by Voxide after the tool call.
          // Strip markdown links, formatting symbols, and URLs so TTS pronounces naturally
          const spokenReply = reply
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // [Title](url) -> Title
            .replace(/[*#_`~]/g, "") // remove formatting symbols
            .replace(/https?:\/\/[^\s\)]+/g, "") // remove bare URLs
            .replace(/\s+/g, " ") // normalize whitespace
            .trim();

          // Show reply text while TTS plays (ChatGPT-style caption).
          setLiveTranscript(spokenReply);
          setTranscriptRole("ai");

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

    // 5. Live captions: user while listening, AI while responding
    const unsubTranscript = client.on(
      "transcript",
      (msg: { role?: string; text?: string; partial?: boolean }) => {
        if (!msg?.text) return;
        if (msg.role === "user") {
          if (assistantBusyRef.current) return; // ignore echo STT
          setLiveTranscript(msg.text);
          setTranscriptRole("user");
        } else if (msg.role === "ai") {
          setLiveTranscript(msg.text);
          setTranscriptRole("ai");
        }
      }
    );

    const unsubMsg = client.on(
      "message",
      (msg: { role?: string; text?: string }) => {
        if (!msg?.text) return;
        if (msg.role === "user") {
          if (assistantBusyRef.current) return;
          setLiveTranscript(msg.text);
          setTranscriptRole("user");
        } else if (msg.role === "ai") {
          setLiveTranscript(msg.text);
          setTranscriptRole("ai");
        }
      }
    );

    return () => {
      cancelled = true;
      clearUnmuteTimer();
      unsubTranscript?.();
      unsubMsg?.();
      client.unregister("askResearchCompanion");
      assistantBusyRef.current = false;
    };
  }, [client, muteMic, unmuteMic, clearUnmuteTimer]);

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
      assistantBusyRef.current = false;
      setLiveTranscript("");
      setTranscriptRole(null);
    }
  }, [voice.status]);

  // Half-duplex: only capture mic while actively listening for the user.
  React.useEffect(() => {
    if (!client || !sessionActive) return;

    if (
      voice.status === "speaking" ||
      voice.status === "executing" ||
      voice.status === "thinking" ||
      voice.status === "connecting"
    ) {
      muteMic();
      return;
    }

    if (voice.status === "listening") {
      if (assistantBusyRef.current) {
        // TTS finished → SDK flipped to listening; release gate after grace.
        assistantBusyRef.current = false;
        unmuteMic(false);
      } else {
        unmuteMic(true);
      }
    }
  }, [client, sessionActive, voice.status, muteMic, unmuteMic]);

  const isSessionOpen = sessionActive || (voice.status !== "idle" && voice.status !== "armed");

  const disconnect = React.useCallback(() => {
    setSessionActive(false);
    assistantBusyRef.current = false;
    clearUnmuteTimer();
    setMicCaptureEnabled(client, true);
    setLiveTranscript("");
    setTranscriptRole(null);
    voice.disconnect();
  }, [voice, client, clearUnmuteTimer]);

  const connect = React.useCallback(async () => {
    setSessionActive(true);
    assistantBusyRef.current = false;
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
    // Stop TTS and open the mic immediately (user barge-in).
    assistantBusyRef.current = false;
    voice.interrupt();
    unmuteMic(true);
    setTranscriptRole("user");
  }, [voice, unmuteMic]);

  const getInputLevel = React.useCallback(() => {
    // Don't animate the orb from speaker bleed while muted/responding.
    if (assistantBusyRef.current || voice.status === "speaking") return 0;
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
    transcriptRole,
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

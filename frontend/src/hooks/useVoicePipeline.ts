"use client";

import * as React from "react";
import { useVoxideVoice, type VoxideClient, type VoxideStatus } from "@voxide/react";
import {
  getVoxideClient,
  fetchVoxideClient,
  setRuntimeVoxideKey,
  clearRuntimeVoxideKey,
  isValidVoxidePublicKey,
  getActiveVoxideKey,
} from "@/lib/voxide";
import type { ChatMode } from "@/types/chat";

/** Person 1 UI states — mapped from verified Voxide statuses only. */
export type VoicePhase =
  | "ready"
  | "listening"
  | "processing"
  | "thinking"
  | "responding"
  | "error";

/** Normalized voice error reasons distinguishing credit/key issues from environment/network failures. */
export type VoiceErrorReason =
  | "credits_expired"
  | "invalid_key"
  | "microphone_permission"
  | "microphone_not_found"
  | "network"
  | "service_unavailable"
  | "unknown";

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
 * Normalizes SDK errors, HTTP codes, and WebSocket events into a structured VoiceErrorReason.
 */
export function classifyVoiceError(error: unknown, errorCode?: string | null): VoiceErrorReason {
  if (errorCode) {
    const lowerCode = errorCode.toLowerCase();
    if (
      lowerCode === "usage_limit" ||
      lowerCode.includes("usage_limit") ||
      lowerCode.includes("quota") ||
      lowerCode.includes("credit") ||
      lowerCode.includes("limit") ||
      lowerCode.includes("billing")
    ) {
      return "credits_expired";
    }
  }

  if (!error) {
    return "unknown";
  }

  const rawMsg =
    typeof error === "string"
      ? error
      : (error as { message?: string })?.message || String(error);
  const rawCode = (error as { code?: string | number })?.code
    ? String((error as { code?: string | number }).code).toLowerCase()
    : "";
  const combined = `${rawMsg} ${rawCode}`.toLowerCase();

  // Credit / Quota / Billing / Unauthorized key failures
  if (
    combined.includes("usage_limit") ||
    combined.includes("credit") ||
    combined.includes("quota") ||
    combined.includes("billing") ||
    combined.includes("payment") ||
    combined.includes("exceeded") ||
    combined.includes("401") ||
    combined.includes("402") ||
    combined.includes("403") ||
    combined.includes("unauthorized") ||
    combined.includes("forbidden") ||
    combined.includes("revoked")
  ) {
    return "credits_expired";
  }

  if (combined.includes("invalid key") || combined.includes("malformed") || combined.includes("bad public key")) {
    return "invalid_key";
  }

  // Microphone permissions
  if (
    combined.includes("permission") ||
    combined.includes("notallowed") ||
    combined.includes("denied")
  ) {
    return "microphone_permission";
  }

  // Microphone hardware not found
  if (
    combined.includes("notfound") ||
    combined.includes("device") ||
    combined.includes("no audio input")
  ) {
    return "microphone_not_found";
  }

  // Network / WebSocket
  if (
    combined.includes("network") ||
    combined.includes("offline") ||
    combined.includes("failed to fetch") ||
    combined.includes("websocket") ||
    combined.includes("econnrefused")
  ) {
    return "network";
  }

  // Service unavailable
  if (combined.includes("500") || combined.includes("503") || combined.includes("service unavailable")) {
    return "service_unavailable";
  }

  return "unknown";
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
 * reply text → Voxide (TTS).
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

  // Sticky state for credit expired dialog: does not auto-dismiss when WS closes
  const [creditExpired, setCreditExpired] = React.useState(false);
  const [errorReason, setErrorReason] = React.useState<VoiceErrorReason | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

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

    // 4. Initialize client and trap credit/auth errors specifically
    client
      .init()
      .then(() => {
        // Do not clear creditExpired here if already flagged
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const reason = classifyVoiceError(err);
          setErrorReason(reason);
          if (reason === "credits_expired") {
            setCreditExpired(true);
          }
          setErrorMessage(err instanceof Error ? err.message : String(err));
          console.warn("[voxide] init error classified as:", reason);
        }
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

    // 6. Capture runtime error events from SDK WebSocket / server
    const unsubErr = client.on("error", (errPayload: any) => {
      if (!cancelled) {
        const reason = classifyVoiceError(errPayload, voice.errorCode);
        setErrorReason(reason);
        if (reason === "credits_expired") {
          setCreditExpired(true);
        }
        setErrorMessage(
          typeof errPayload === "string"
            ? errPayload
            : errPayload?.message || "Voice service error"
        );
      }
    });

    return () => {
      cancelled = true;
      clearUnmuteTimer();
      unsubTranscript?.();
      unsubMsg?.();
      unsubErr?.();
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

  // Keep errorReason in sync with voice.errorCode
  React.useEffect(() => {
    if (voice.errorCode) {
      const reason = classifyVoiceError(null, voice.errorCode);
      setErrorReason(reason);
      if (reason === "credits_expired") {
        setCreditExpired(true);
      }
    }
  }, [voice.errorCode]);

  const rawPhase = mapVoicePhase(voice.status);
  const phase: VoicePhase = (creditExpired || errorReason) ? "error" : rawPhase;
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
      // Don't close session panel immediately if credits expired so user can replace key
      if (!creditExpired && errorReason !== "credits_expired") {
        setSessionActive(false);
        assistantBusyRef.current = false;
        setLiveTranscript("");
        setTranscriptRole(null);
      }
    }
  }, [voice.status, errorReason, creditExpired]);

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

  const isSessionOpen =
    sessionActive ||
    (voice.status !== "idle" && voice.status !== "armed") ||
    creditExpired ||
    errorReason === "credits_expired";

  const disconnect = React.useCallback(() => {
    setSessionActive(false);
    assistantBusyRef.current = false;
    clearUnmuteTimer();
    setMicCaptureEnabled(client, true);
    setLiveTranscript("");
    setTranscriptRole(null);
    voice.disconnect();
  }, [voice, client, clearUnmuteTimer]);

  const dismissCreditError = React.useCallback(() => {
    setCreditExpired(false);
    setErrorReason(null);
    setErrorMessage(null);
    disconnect();
  }, [disconnect]);

  const openKeyModal = React.useCallback(() => {
    setCreditExpired(true);
    setErrorReason("credits_expired");
    setSessionActive(true);
  }, []);

  const connect = React.useCallback(async () => {
    if (!client) {
      openKeyModal();
      return;
    }
    try {
      setSessionActive(true);
      assistantBusyRef.current = false;

      if (!client.isInitialized) {
        await client.init();
      }
      await voice.connect();
    } catch (err: unknown) {
      const reason = classifyVoiceError(err, voice.errorCode);
      setErrorReason(reason);
      if (reason === "credits_expired") {
        setCreditExpired(true);
      }
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }, [client, voice, openKeyModal]);

  const toggle = React.useCallback(async () => {
    if (!client || !getActiveVoxideKey()) {
      openKeyModal();
      return;
    }
    if (isSessionOpen && !creditExpired) {
      disconnect();
      return;
    }
    await connect();
  }, [client, isSessionOpen, creditExpired, disconnect, connect, openKeyModal]);

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

  /**
   * Replaces the current Voxide public key at runtime with seamless re-initialization.
   */
  const replaceKey = React.useCallback(
    async (newKey: string): Promise<{ success: boolean; error?: string }> => {
      const trimmed = newKey.trim();
      if (!isValidVoxidePublicKey(trimmed)) {
        return {
          success: false,
          error: "That doesn't look like a valid Voxide public API key.",
        };
      }

      try {
        if (voice.status !== "idle") {
          voice.disconnect();
        }

        const freshClient = setRuntimeVoxideKey(trimmed);
        setClient(freshClient);
        setCreditExpired(false);
        setErrorReason(null);
        setErrorMessage(null);
        setSessionActive(true);

        await freshClient.init();
        // Immediately trigger connection with the fresh key
        await freshClient.connect();
        return { success: true };
      } catch (err: unknown) {
        const reason = classifyVoiceError(err);
        setErrorReason(reason);
        if (reason === "credits_expired") {
          setCreditExpired(true);
        }
        const msg = err instanceof Error ? err.message : "Failed to initialize key";
        setErrorMessage(msg);
        return { success: false, error: msg };
      }
    },
    [voice]
  );

  const clearKey = React.useCallback(() => {
    clearRuntimeVoxideKey();
    setClient(null);
    setCreditExpired(false);
    setErrorReason(null);
    disconnect();
  }, [disconnect]);

  const isCreditExpired = creditExpired || errorReason === "credits_expired" || voice.errorCode === "usage_limit";

  return {
    available: Boolean(client),
    status: voice.status,
    phase,
    liveTranscript,
    transcriptRole,
    currentAction: voice.currentAction,
    errorCode: voice.errorCode,
    errorReason,
    errorMessage,
    isCreditExpired,
    isSessionOpen,
    connect,
    disconnect,
    interrupt,
    getInputLevel,
    getOutputLevel,
    toggle,
    replaceKey,
    clearKey,
    openKeyModal,
    dismissCreditError,
  };
}

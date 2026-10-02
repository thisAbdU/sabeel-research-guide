"use client";

import * as React from "react";
import { useVoxideVoice, type VoxideStatus } from "@voxide/react";
import { getVoxideClient } from "@/lib/voxide";
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
  const client = React.useMemo(() => getVoxideClient(), []);
  const voice = useVoxideVoice(client);

  const sendRef = React.useRef(options.sendThroughChat);
  sendRef.current = options.sendThroughChat;

  const modeRef = React.useRef(options.mode);
  modeRef.current = options.mode;

  const conversationIdRef = React.useRef(options.conversationId);
  conversationIdRef.current = options.conversationId;

  React.useEffect(() => {
    if (!client) return;

    let cancelled = false;
    client.init().catch((err: unknown) => {
      if (!cancelled) console.error("[voxide] init failed", err);
    });

    client.register({
      askResearchCompanion: {
        description:
          "Send the user's research message to the ScholarXiv research companion and return its reply. Use this for Vent (ideation), Roast (critical feedback), or Get Funding (funder matching). Always call this instead of inventing research advice yourself.",
        params: {
          message: {
            type: "string",
            required: true,
            description: "The user's research question or statement as text",
          },
        },
        scope: "/chat",
        handler: async (args: Record<string, unknown>) => {
          const text = String(args.message ?? "").trim();
          if (!text) return { ok: false, error: "Empty message" };

          const reply = await sendRef.current(text);
          if (!reply) return { ok: false, error: "Research companion returned no reply" };

          // Returned fields are spoken by Voxide after the tool call.
          return { ok: true, reply };
        },
      },
    });

    client.setActiveRoute("/chat");
    client.bindState(() => ({
      page: "/chat",
      mode: modeRef.current,
      conversationId: conversationIdRef.current,
    }));

    return () => {
      cancelled = true;
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
  const isSessionOpen = phase !== "ready" && phase !== "error";

  const toggle = React.useCallback(async () => {
    if (!client) return;
    if (isSessionOpen) {
      voice.disconnect();
      return;
    }
    await voice.connect();
  }, [client, isSessionOpen, voice]);

  return {
    available: Boolean(client),
    status: voice.status,
    phase,
    currentAction: voice.currentAction,
    errorCode: voice.errorCode,
    isSessionOpen,
    connect: voice.connect,
    disconnect: voice.disconnect,
    toggle,
  };
}

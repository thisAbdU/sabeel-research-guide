import type {
  ChatRequestPayload,
  ChatResponseData,
} from "@/types/chat";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

export class ChatApiError extends Error {
  status: number;

  constructor(message: string, status: number = 500) {
    super(message);
    this.name = "ChatApiError";
    this.status = status;
  }
}

export async function sendChatMessage(
  payload: ChatRequestPayload,
  onStatus?: (text: string) => void
): Promise<ChatResponseData> {
  const endpoint = `${API_BASE_URL}/api/chat`;
  console.info("[chat] POST", endpoint, payload.mode);

  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",

      // Send the backend authentication cookie
      credentials: "include",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        mode: payload.mode,
        conversationId: payload.conversationId || null,
        message: payload.message.trim(),
      }),
    });
  } catch (err) {
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error("[chat] fetch threw before any HTTP response", { endpoint, mode: payload.mode, detail, err });
    throw new ChatApiError(
      `Unable to reach the backend at ${endpoint}. ${detail}. This fires before Exa or Groq return a status — the request never completed.`,
      503
    );
  }

  if (!response.ok) {
    let errorDescription = "";

    try {
      const errorJson = await response.json();

      if (typeof errorJson?.error === "string") {
        errorDescription = errorJson.error;
      } else if (
        typeof errorJson?.error?.message === "string"
      ) {
        errorDescription = errorJson.error.message;
      }
    } catch {
      // Response body was not JSON.
    }

    if (response.status === 401) {
      throw new ChatApiError(
        "Your session has expired. Please sign in again to continue researching.",
        401
      );
    }

    if (response.status === 404) {
      throw new ChatApiError(
        "The conversation session was not found on the server. Starting a new session is recommended.",
        404
      );
    }

    console.error("[chat] HTTP error", response.status, errorDescription);

    if (
      response.status === 502 ||
      response.status === 503
    ) {
      throw new ChatApiError(
        errorDescription || "The AI companion service is currently unavailable. Please try again shortly.",
        response.status
      );
    }

    throw new ChatApiError(
      errorDescription ||
        "Something went wrong while processing your research request. Please try again.",
      response.status
    );
  }

  let result: {
    data?: ChatResponseData;
    error?: string;
  };

  try {
    result = await readChatStream(response, onStatus);
  } catch (err) {
    if (err instanceof ChatApiError) throw err;
    throw new ChatApiError(
      "Received an invalid response format from the research server.",
      500
    );
  }

  if (typeof result?.error === "string" && result.error) {
    throw new ChatApiError(result.error, response.status);
  }

  if (!result?.data || !result.data.message) {
    throw new ChatApiError(
      "The research companion returned an incomplete response. Please try again.",
      500
    );
  }

  return result.data;
}

async function readChatStream(
  response: Response,
  onStatus?: (text: string) => void
): Promise<{ data?: ChatResponseData; error?: string }> {
  if (!response.body) {
    throw new ChatApiError("Received an invalid response format from the research server.", 500);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: { data?: ChatResponseData; error?: string } | null = null;

  const take = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) return;
    const message = JSON.parse(trimmed) as { status?: string; data?: ChatResponseData; error?: string };
    if (typeof message.status === "string" && !message.data) {
      onStatus?.(message.status);
      return;
    }
    result = message;
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) take(line);
    if (done) break;
  }
  if (buffer.trim()) take(buffer);

  if (!result) {
    throw new ChatApiError("Received an invalid response format from the research server.", 500);
  }
  return result;
}
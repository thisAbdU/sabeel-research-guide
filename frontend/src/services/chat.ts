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
  payload: ChatRequestPayload
): Promise<ChatResponseData> {
  const endpoint = `${API_BASE_URL}/api/chat`;

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
  } catch {
    throw new ChatApiError(
      "Unable to reach the ScholarXiv backend service. Please check your internet connection or try again later.",
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

    if (
      response.status === 502 ||
      response.status === 503
    ) {
      throw new ChatApiError(
        "The AI companion service is currently unavailable. Please try again shortly.",
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
  };

  try {
    result = await response.json();
  } catch {
    throw new ChatApiError(
      "Received an invalid response format from the research server.",
      500
    );
  }

  if (!result?.data || !result.data.message) {
    throw new ChatApiError(
      "The research companion returned an incomplete response. Please try again.",
      500
    );
  }

  return result.data;
}
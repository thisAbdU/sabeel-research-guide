import { VoxideClient } from "@voxide/react";

/** Storage key for runtime replacement keys in the current browser session. */
export const VOXIDE_RUNTIME_KEY_STORAGE = "voxide_runtime_public_key";

let client: VoxideClient | null | undefined;
let clientPromise: Promise<VoxideClient | null> | null = null;

/**
 * Validates whether a candidate string conforms to the Voxide public key format.
 * Format: starts with 'vox_pub_' and has sufficient characters.
 */
export function isValidVoxidePublicKey(key: unknown): boolean {
  if (typeof key !== "string") return false;
  const trimmed = key.trim();
  return trimmed.startsWith("vox_pub_") && trimmed.length > 8;
}

/**
 * Reads the runtime replacement key from sessionStorage if present in browser context.
 */
export function getRuntimeVoxideKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.sessionStorage.getItem(VOXIDE_RUNTIME_KEY_STORAGE)?.trim();
    if (stored && isValidVoxidePublicKey(stored)) {
      return stored;
    }
  } catch {
    // Gracefully ignore storage read restrictions
  }
  return null;
}

/**
 * Resolves the currently active Voxide public key following priority order:
 * 1. Runtime replacement key in sessionStorage
 * 2. Build/environment public key (NEXT_PUBLIC_VOXIDE_PUBLIC_KEY / VOXIDE_PUBLIC_KEY)
 */
export function getActiveVoxideKey(): string | null {
  const runtimeKey = getRuntimeVoxideKey();
  if (runtimeKey) return runtimeKey;

  const envKey =
    process.env.VOXIDE_PUBLIC_KEY?.trim() ||
    process.env.NEXT_PUBLIC_VOXIDE_PUBLIC_KEY?.trim() ||
    "";

  if (isValidVoxidePublicKey(envKey)) {
    return envKey;
  }

  return null;
}

/**
 * Destroys the active Voxide client instance, freeing audio streams,
 * WebSockets, and listeners cleanly before tearing down the reference.
 */
export function destroyVoxideClient(): void {
  if (client) {
    try {
      if (typeof client.destroy === "function") {
        client.destroy();
      }
    } catch {
      // Ignore teardown errors during force reset
    }
  }
  client = null;
  clientPromise = null;
}

/**
 * Replaces the Voxide public key at runtime for the current session.
 * Safely destroys any active client, persists the new key in sessionStorage,
 * and creates a fresh VoxideClient ready for immediate initialization.
 */
export function setRuntimeVoxideKey(newKey: string): VoxideClient {
  const trimmed = newKey.trim();
  if (!isValidVoxidePublicKey(trimmed)) {
    throw new Error("That doesn't look like a valid Voxide public API key.");
  }

  // Teardown previous client and WebSocket/MediaStream sessions
  destroyVoxideClient();

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(VOXIDE_RUNTIME_KEY_STORAGE, trimmed);
    } catch {
      // Storage quota or policy restriction
    }
  }

  client = new VoxideClient({ publicKey: trimmed });
  return client;
}

/**
 * Clears the runtime replacement key from sessionStorage and resets the client.
 */
export function clearRuntimeVoxideKey(): void {
  destroyVoxideClient();
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(VOXIDE_RUNTIME_KEY_STORAGE);
    } catch {
      // Storage quota or policy restriction
    }
  }
}

/**
 * Returns the VoxideClient synchronously if available.
 * Checks runtime replacement key first, then environment key.
 */
export function getVoxideClient(explicitKey?: string): VoxideClient | null {
  if (explicitKey) {
    if (!isValidVoxidePublicKey(explicitKey)) return null;
    if (client && client.publicKey === explicitKey) {
      return client;
    }
    destroyVoxideClient();
    client = new VoxideClient({ publicKey: explicitKey });
    return client;
  }

  const activeKey = getActiveVoxideKey();

  if (client) {
    if (activeKey && client.publicKey === activeKey) {
      return client;
    }
    // Key changed or was cleared — rebuild
    destroyVoxideClient();
  }

  if (client !== undefined && !activeKey) {
    return client;
  }

  if (!activeKey) {
    client = null;
    return client;
  }

  client = new VoxideClient({ publicKey: activeKey });
  return client;
}

/**
 * Fetches the Voxide public key asynchronously from the server (/api/voice)
 * if no runtime key or static environment key is already configured.
 */
export async function fetchVoxideClient(): Promise<VoxideClient | null> {
  const syncClient = getVoxideClient();
  if (syncClient) return syncClient;

  if (clientPromise) return clientPromise;

  clientPromise = (async () => {
    try {
      // Check runtime key first
      const runtimeKey = getRuntimeVoxideKey();
      if (runtimeKey) {
        client = new VoxideClient({ publicKey: runtimeKey });
        return client;
      }

      const res = await fetch("/api/voice", { credentials: "include" });
      if (!res.ok) {
        client = null;
        return null;
      }
      const data = (await res.json()) as { configured?: boolean; publicKey?: string };
      if (data?.publicKey && isValidVoxidePublicKey(data.publicKey)) {
        // Re-check runtime key in case one was entered during fetch
        const currentRuntime = getRuntimeVoxideKey();
        const finalKey = currentRuntime || data.publicKey;
        client = new VoxideClient({ publicKey: finalKey });
        return client;
      }
    } catch (err) {
      console.warn("[voxide] Failed to fetch voice config from /api/voice:", err);
    }
    client = null;
    return null;
  })();

  return clientPromise;
}

export function isVoxideConfigured(): boolean {
  return Boolean(getActiveVoxideKey() || getVoxideClient() !== null);
}

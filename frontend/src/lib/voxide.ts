import { VoxideClient } from "@voxide/react";

let client: VoxideClient | null | undefined;
let clientPromise: Promise<VoxideClient | null> | null = null;

/**
 * Returns the VoxideClient synchronously if already initialized or available in environment.
 */
export function getVoxideClient(explicitKey?: string): VoxideClient | null {
  if (explicitKey) {
    if (!client || client.publicKey !== explicitKey) {
      client = new VoxideClient({ publicKey: explicitKey });
    }
    return client;
  }

  if (client !== undefined) return client;

  const publicKey =
    process.env.VOXIDE_PUBLIC_KEY?.trim() ||
    process.env.NEXT_PUBLIC_VOXIDE_PUBLIC_KEY?.trim() ||
    "";

  if (!publicKey.startsWith("vox_pub_")) {
    client = null;
    return client;
  }

  client = new VoxideClient({ publicKey });
  return client;
}

/**
 * Fetches the Voxide public key asynchronously from the server (/api/voice)
 * so VOXIDE_PUBLIC_KEY is never exposed in static client-side JS bundles.
 */
export async function fetchVoxideClient(): Promise<VoxideClient | null> {
  if (client) return client;

  const syncClient = getVoxideClient();
  if (syncClient) return syncClient;

  if (clientPromise) return clientPromise;

  clientPromise = (async () => {
    try {
      const res = await fetch("/api/voice", { credentials: "include" });
      if (!res.ok) {
        client = null;
        return null;
      }
      const data = (await res.json()) as { configured?: boolean; publicKey?: string };
      if (data?.publicKey && data.publicKey.startsWith("vox_pub_")) {
        client = new VoxideClient({ publicKey: data.publicKey });
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
  return getVoxideClient() !== null;
}

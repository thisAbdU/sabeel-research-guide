import { VoxideClient } from "@voxide/react";

let client: VoxideClient | null | undefined;

/** Publishable key only — never a secret. Returns null when unset/invalid. */
export function getVoxideClient(): VoxideClient | null {
  if (client !== undefined) return client;

  const publicKey = process.env.NEXT_PUBLIC_VOXIDE_PUBLIC_KEY?.trim() ?? "";
  if (!publicKey.startsWith("vox_pub_")) {
    client = null;
    return client;
  }

  client = new VoxideClient({ publicKey });
  return client;
}

export function isVoxideConfigured(): boolean {
  return getVoxideClient() !== null;
}

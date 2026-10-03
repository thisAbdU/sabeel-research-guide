import { apiFetch } from "@/lib/api";
import type { ResearchSource } from "@/types/chat";

export type FundingMatch = {
  id: string;
  researchProjectId: string;
  researchTitle?: string | null;
  organizationName: string;
  programName: string | null;
  description: string | null;
  url: string | null;
  relevanceNote: string | null;
  relevanceScore: number | null;
  createdAt: string;
};

export function funderKey(source: {
  title?: string;
  organizationName?: string;
  url?: string | null;
}): string {
  const name = (source.organizationName || source.title || "").trim().toLowerCase();
  const url = (source.url || "").trim().toLowerCase();
  return `${name}|${url}`;
}

export async function listFundingMatches(opts?: {
  conversationId?: string | null;
  researchProjectId?: string | null;
}): Promise<{ matches: FundingMatch[]; researchProjectId?: string }> {
  const params = new URLSearchParams();
  if (opts?.researchProjectId) params.set("researchProjectId", opts.researchProjectId);
  if (opts?.conversationId) params.set("conversationId", opts.conversationId);
  const qs = params.toString();
  return apiFetch(`/api/funding${qs ? `?${qs}` : ""}`);
}

export async function saveFundingMatch(input: {
  conversationId?: string | null;
  researchProjectId?: string | null;
  source: ResearchSource;
}): Promise<{ match: FundingMatch; researchProjectId: string }> {
  return apiFetch("/api/funding", {
    method: "POST",
    body: JSON.stringify({
      conversationId: input.conversationId || undefined,
      researchProjectId: input.researchProjectId || undefined,
      organizationName: input.source.title,
      programName: input.source.program || undefined,
      description: input.source.summary || undefined,
      url: input.source.url || input.source.socials?.website || undefined,
      relevanceNote: input.source.whyMatch || undefined,
    }),
  });
}

export async function removeFundingMatch(id: string): Promise<void> {
  await apiFetch(`/api/funding?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.error(`[apiFetch] Error on ${path}:`, data || response.statusText);
    throw new Error(
      data?.message ||
        data?.error ||
        "Something went wrong"
    );
  }

  return data;
}
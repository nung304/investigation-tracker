"use client";

export async function apiFetch<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message = (isJson && (data as { error?: string })?.error) || "เกิดข้อผิดพลาด";
    throw new Error(message);
  }

  return data as T;
}

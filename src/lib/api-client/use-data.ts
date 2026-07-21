"use client";

import { useCallback, useEffect, useState } from "react";

export async function callApi(endpoint: string, args: Record<string, unknown> = {}) {
  const res = await fetch(`/api/data/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `API error ${res.status}`);
  }
  return res.json();
}

export function useQuery<T>(endpoint: string, args: Record<string, unknown> | "skip" = {}) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);

  const fetcher = useCallback(async () => {
    if (args === "skip") return;
    try {
      const result = await callApi(endpoint, args);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [endpoint, JSON.stringify(args)]);

  useEffect(() => {
    void fetcher();
  }, [fetcher]);

  return data;
}

export function useMutation<TArgs extends Record<string, unknown> = Record<string, any>, TResult = any>(endpoint: string) {
  return useCallback(
    async (args: TArgs): Promise<TResult> => {
      const result = await callApi(endpoint, args);
      // Trigger a window refresh event so active queries re-fetch automatically
      window.dispatchEvent(new Event("app:data-updated"));
      return result as TResult;
    },
    [endpoint],
  );
}

export async function fetchQuery<T>(endpoint: string, args: Record<string, unknown> = {}) {
  return callApi(endpoint, args) as Promise<T>;
}

export async function fetchMutation<T>(endpoint: string, args: Record<string, unknown> = {}) {
  return callApi(endpoint, args) as Promise<T>;
}

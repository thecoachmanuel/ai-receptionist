"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Global SWR cache & subscription manager
const queryCache = new Map<string, any>();
const listeners = new Map<string, Set<(data: any) => void>>();

function getCacheKey(endpoint: string, args: Record<string, unknown> | "skip") {
  if (args === "skip") return null;
  return `${endpoint}:${JSON.stringify(args ?? {})}`;
}

export function updateQueryCache(endpoint: string, data: any, args: Record<string, unknown> = {}) {
  const key = getCacheKey(endpoint, args);
  if (!key) return;
  queryCache.set(key, data);
  const set = listeners.get(key);
  if (set) {
    set.forEach((listener) => listener(data));
  }
}

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
  const data = await res.json();
  
  // Store result in queryCache immediately
  updateQueryCache(endpoint, data, args);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("app:data-updated"));
  }
  return data;
}

export function useQuery<T>(
  endpoint: string,
  args: Record<string, unknown> | "skip" = {},
  options?: { initialData?: T },
) {
  const cacheKey = getCacheKey(endpoint, args);
  
  const [data, setData] = useState<T | undefined>(() => {
    if (cacheKey && queryCache.has(cacheKey)) {
      return queryCache.get(cacheKey) as T;
    }
    return options?.initialData;
  });
  const [error, setError] = useState<Error | null>(null);

  // Sync initialData or cached value if cache gets populated
  useEffect(() => {
    if (cacheKey && queryCache.has(cacheKey)) {
      setData(queryCache.get(cacheKey) as T);
    } else if (options?.initialData !== undefined && data === undefined) {
      setData(options.initialData);
    }
  }, [cacheKey, options?.initialData]);

  // Subscribe to specific cache updates
  useEffect(() => {
    if (!cacheKey) return;
    if (!listeners.has(cacheKey)) {
      listeners.set(cacheKey, new Set());
    }
    const set = listeners.get(cacheKey)!;
    const listener = (newData: any) => setData(newData);
    set.add(listener);
    return () => {
      set.delete(listener);
      if (set.size === 0) listeners.delete(cacheKey);
    };
  }, [cacheKey]);

  const fetcher = useCallback(async () => {
    if (args === "skip" || !cacheKey) return;
    try {
      const result = await callApi(endpoint, args);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [endpoint, cacheKey]);

  useEffect(() => {
    void fetcher();
  }, [fetcher]);

  useEffect(() => {
    const handleDataUpdated = () => {
      void fetcher();
    };
    window.addEventListener("app:data-updated", handleDataUpdated);
    return () => {
      window.removeEventListener("app:data-updated", handleDataUpdated);
    };
  }, [fetcher]);

  return data;
}

export function useMutation<TArgs extends Record<string, unknown> = Record<string, any>, TResult = any>(endpoint: string) {
  return useCallback(
    async (args: TArgs): Promise<TResult> => {
      const result = await callApi(endpoint, args);
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


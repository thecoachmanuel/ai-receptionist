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
  
  // Store result in queryCache immediately and notify subscribers
  updateQueryCache(endpoint, data, args);
  return data;
}

export function invalidateQueries(domain?: string) {
  if (!domain) {
    queryCache.clear();
  } else {
    for (const key of queryCache.keys()) {
      if (key.includes(domain) || key.includes("dashboard/overview")) {
        queryCache.delete(key);
      }
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("app:query-invalidated", { detail: { domain } }));
  }
}

export function clearAllCache() {
  queryCache.clear();
  listeners.clear();
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem("oneboard_auth_user");
      sessionStorage.removeItem("oneboard_auth_org");
      sessionStorage.clear();
    } catch {}
    window.dispatchEvent(new CustomEvent("app:query-invalidated", { detail: {} }));
  }
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

  const fetcher = useCallback(async (forceFetch = false) => {
    if (args === "skip" || !cacheKey) return;
    // Serve from cache immediately; only fetch if data is not in cache or forced
    if (!forceFetch && queryCache.has(cacheKey)) return;
    try {
      const result = await callApi(endpoint, args);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [endpoint, cacheKey, args]);

  useEffect(() => {
    void fetcher(false);
  }, [fetcher]);

  useEffect(() => {
    const handleInvalidated = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      const domain = detail?.domain;
      if (!domain || !cacheKey || cacheKey.includes(domain) || cacheKey.includes("dashboard/overview")) {
        void fetcher(true);
      }
    };
    window.addEventListener("app:query-invalidated", handleInvalidated);
    return () => {
      window.removeEventListener("app:query-invalidated", handleInvalidated);
    };
  }, [fetcher, cacheKey]);

  return data;
}

export function useMutation<TArgs extends Record<string, unknown> = Record<string, any>, TResult = any>(endpoint: string) {
  return useCallback(
    async (args: TArgs): Promise<TResult> => {
      const result = await callApi(endpoint, args);
      const domain = endpoint.split("/")[0];
      invalidateQueries(domain);
      return result as TResult;
    },
    [endpoint],
  );
}

export async function fetchQuery<T>(endpoint: string, args: Record<string, unknown> = {}) {
  return callApi(endpoint, args) as Promise<T>;
}

export async function fetchMutation<T>(endpoint: string, args: Record<string, unknown> = {}) {
  const result = await callApi(endpoint, args);
  const domain = endpoint.split("/")[0];
  invalidateQueries(domain);
  return result as T;
}


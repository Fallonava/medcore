/**
 * useSSE — Reusable Server-Sent Events hook
 *
 * Uses ONE EventSource connection for all named events.
 *
 * Features:
 *  - Named event handlers: { doctors: fn, shifts: fn, ... }
 *  - Unnamed `message` handler via `onMessage`
 *  - Automatic reconnect with exponential backoff (1s → 2s → 4s → max 30s)
 *  - Connection status: 'connecting' | 'connected' | 'reconnecting' | 'error'
 *  - Stable handler refs (safe to pass inline functions from render)
 *  - Cleanup on unmount
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export type SSEStatus = 'connecting' | 'connected' | 'reconnecting' | 'error';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (data: any) => void;

export interface UseSSEOptions {
  /** URL of the SSE endpoint */
  url: string;
  /**
   * Named event handlers.
   * Keys = SSE event names (e.g. 'doctors', 'settings')
   * Values = callback receiving the parsed JSON payload
   */
  handlers: Record<string, AnyFn>;
  /** Handler for unnamed `data:` events (legacy fallback) */
  onMessage?: AnyFn;
  /** Called when connection status changes */
  onStatus?: (status: SSEStatus) => void;
  /** Max reconnect delay in ms (default: 30000) */
  maxDelay?: number;
}

export function useSSE({
  url,
  handlers,
  onMessage,
  onStatus,
  maxDelay = 30_000,
}: UseSSEOptions): SSEStatus {
  const [status, setStatus] = useState<SSEStatus>('connecting');

  // Keep handler refs stable so the effect doesn't re-run on every render
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  const retryDelay = useRef(1000);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const unmounted = useRef(false);

  const updateStatus = useCallback((s: SSEStatus) => {
    setStatus(s);
    onStatusRef.current?.(s);
  }, []);

  useEffect(() => {
    unmounted.current = false;

    const connect = () => {
      if (unmounted.current) return;
      updateStatus(retryDelay.current > 1000 ? 'reconnecting' : 'connecting');

      const es = new EventSource(url);
      esRef.current = es;

      es.onopen = () => {
        retryDelay.current = 1000;
        updateStatus('connected');
      };

      // Unnamed message handler (legacy fallback)
      es.onmessage = (ev: MessageEvent) => {
        try { onMessageRef.current?.(JSON.parse(ev.data)); } catch { /* ignore */ }
      };

      // Register named event listeners from handlers map
      const currentHandlers = handlersRef.current;
      for (const [eventName, handler] of Object.entries(currentHandlers)) {
        es.addEventListener(eventName, (ev: Event) => {
          try { handler(JSON.parse((ev as MessageEvent).data)); } catch { /* ignore */ }
        });
      }

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (unmounted.current) return;
        updateStatus('reconnecting');
        const delay = Math.min(retryDelay.current, maxDelay);
        retryDelay.current = Math.min(retryDelay.current * 2, maxDelay);
        retryTimer.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      unmounted.current = true;
      esRef.current?.close();
      esRef.current = null;
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
    // Only re-create connection when URL changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, maxDelay]);

  return status;
}

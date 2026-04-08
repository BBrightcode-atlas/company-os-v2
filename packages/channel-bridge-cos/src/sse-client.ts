/**
 * Minimal SSE client for the bridge.
 *
 * Uses the `eventsource` npm package (Node 20+ has a built-in
 * EventSource too, but we pin to the library for consistent header
 * support across Node versions).
 *
 * Responsibilities:
 *   - Connect to GET /agents/:aid/stream?since=<cursor>
 *   - Pass Bearer auth header
 *   - Parse "message" events and forward to the onMessage handler
 *   - Reconnect with exponential backoff on error
 *   - Resume cursor is re-computed by the caller — each reconnect
 *     calls urlFactory() again so the URL includes the latest
 *     lastMessageId from state.json.
 */

import { EventSource as EventSourceCtor } from "eventsource";

interface SseClientOptions {
  urlFactory: () => string;
  headersFactory: () => Record<string, string>;
  onMessage: (payload: unknown) => void | Promise<void>;
  onError?: (err: unknown) => void;
  onOpen?: () => void;
  backoff?: { initialMs: number; maxMs: number; multiplier: number };
}

export interface SseClient {
  close(): void;
}

export function createSseClient(opts: SseClientOptions): SseClient {
  const backoff = opts.backoff ?? { initialMs: 1000, maxMs: 30_000, multiplier: 2 };
  let currentDelay = backoff.initialMs;
  let es: InstanceType<typeof EventSourceCtor> | null = null;
  let closed = false;
  let reconnectTimer: NodeJS.Timeout | null = null;

  function connect() {
    if (closed) return;
    const url = opts.urlFactory();
    const headers = opts.headersFactory();
    try {
      // eventsource@3 accepts an init with `fetch` to let us inject headers
      es = new EventSourceCtor(url, {
        fetch: (input: any, init: any) =>
          fetch(input, {
            ...init,
            headers: { ...(init?.headers ?? {}), ...headers },
          }),
      } as any);
    } catch (err) {
      opts.onError?.(err);
      scheduleReconnect();
      return;
    }

    es.onopen = () => {
      currentDelay = backoff.initialMs;
      opts.onOpen?.();
    };

    // Serialize onMessage dispatch. EventSource can deliver many
    // events back-to-back during replay; if onMessage is async and
    // we don't await, two handlers race on shared state (cursor file,
    // message→room map) and the cursor can move backward.
    let chain: Promise<void> = Promise.resolve();
    es.addEventListener("message", (evt: MessageEvent) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(evt.data);
      } catch (err) {
        opts.onError?.(err);
        return;
      }
      chain = chain.then(
        () => Promise.resolve(opts.onMessage(parsed)).catch((err) => {
          opts.onError?.(err);
        }),
      );
    });

    es.onerror = (err: unknown) => {
      opts.onError?.(err);
      if (es) {
        es.close();
        es = null;
      }
      scheduleReconnect();
    };
  }

  function scheduleReconnect() {
    if (closed) return;
    if (reconnectTimer) return;
    const delay = currentDelay;
    currentDelay = Math.min(currentDelay * backoff.multiplier, backoff.maxMs);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  connect();

  return {
    close() {
      closed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (es) {
        es.close();
        es = null;
      }
    },
  };
}

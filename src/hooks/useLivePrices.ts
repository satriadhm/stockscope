"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

/**
 * Live price overlay delivered over the server's `prices:update` broadcast.
 * Keyed by internal stock code (uppercase).
 */
export interface LivePrice {
  lastPrice: number;
  volume?: number;
  marketCap?: number;
}

interface PricesUpdatePayload {
  at: number;
  prices: Array<{
    code: string;
    lastPrice: number;
    volume?: number;
    marketCap?: number;
  }>;
}

// A single shared socket connection for the whole client. Multiple components
// using live prices reuse one connection rather than opening their own.
let sharedSocket: Socket | null = null;

function getSocket(): Socket {
  if (!sharedSocket) {
    sharedSocket = io({ path: "/socket.io", transports: ["websocket"] });
  }
  return sharedSocket;
}

/**
 * Subscribe to live price updates broadcast by the server.
 *
 * Returns a map of stock code -> latest price fields. Updates accumulate so a
 * code keeps its last-known live price between broadcasts.
 */
export function useLivePrices(): {
  prices: Map<string, LivePrice>;
  lastUpdate: number | null;
} {
  const [prices, setPrices] = useState<Map<string, LivePrice>>(new Map());
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  useEffect(() => {
    const socket = getSocket();

    function onPrices(payload: PricesUpdatePayload): void {
      if (!payload?.prices?.length) return;
      setPrices((prev) => {
        const next = new Map(prev);
        for (const p of payload.prices) {
          next.set(p.code.toUpperCase(), {
            lastPrice: p.lastPrice,
            volume: p.volume,
            marketCap: p.marketCap,
          });
        }
        return next;
      });
      setLastUpdate(payload.at ?? Date.now());
    }

    socket.on("prices:update", onPrices);
    return () => {
      socket.off("prices:update", onPrices);
    };
  }, []);

  return { prices, lastUpdate };
}

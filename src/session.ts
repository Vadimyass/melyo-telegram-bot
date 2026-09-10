// Состояние диалога на чат. Edge/serverless stateless — поэтому храним в Deno KV
// (Deno Deploy даёт KV из коробки). Держим только лёгкое: связка + короткая история.
import type { StorageAdapter } from "grammy";

export interface SessionData {
  linked: boolean;
  userId?: string;
  state: "idle" | "awaiting_artifact";
  history: { role: "user" | "melio"; content: string }[];
}

export function initial(): SessionData {
  return { linked: false, state: "idle", history: [] };
}

const kv = await Deno.openKv();

export function kvStorage<T>(prefix = "sess"): StorageAdapter<T> {
  return {
    async read(key) {
      const r = await kv.get<T>([prefix, key]);
      return r.value ?? undefined;
    },
    async write(key, value) {
      await kv.set([prefix, key], value);
    },
    async delete(key) {
      await kv.delete([prefix, key]);
    },
  };
}

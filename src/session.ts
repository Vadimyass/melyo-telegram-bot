// Состояние диалога на чат. Edge/serverless stateless — поэтому храним в Deno KV
// (Deno Deploy даёт KV из коробки). Держим только лёгкое: связка + короткая история.
import type { StorageAdapter } from "grammy";

export interface SessionData {
  linked: boolean;
  userId?: string;
  state: "idle" | "awaiting_artifact" | "support" | "awaiting_outcome";
  pendingCommitId?: string; // крок «якщо–то», про результат якого чекаємо пару слів
  history: { role: "user" | "melio"; content: string }[];
}

export function initial(): SessionData {
  return { linked: false, state: "idle", history: [] };
}

// KV если он привязан к приложению; иначе — in-memory фолбэк. Важное состояние
// (память профиля, история диалога) хранится в Supabase на бэкенде, так что потеря
// локальной сессии при рестарте некритична — бот просто не должен падать на старте.
let kv: Deno.Kv | null = null;
try {
  kv = await Deno.openKv();
} catch (_) {
  console.warn("Deno KV не привязан — сессии в памяти (состояние живёт в Supabase).");
  kv = null;
}

// Захист від дублів: Telegram повторює апдейт, якщо вебхук не відповів вчасно (довгий
// виклик LLM). Атомарно фіксуємо update_id — повтор з тим самим id пропускаємо.
const seenMem = new Set<number>();
export async function firstSeen(updateId: number): Promise<boolean> {
  if (!kv) {
    if (seenMem.has(updateId)) return false;
    seenMem.add(updateId);
    if (seenMem.size > 5000) seenMem.clear();
    return true;
  }
  const key = ["upd", updateId];
  const res = await kv.atomic().check({ key, versionstamp: null }).set(key, 1, { expireIn: 86_400_000 }).commit();
  return res.ok;
}

export function kvStorage<T>(prefix = "sess"): StorageAdapter<T> {
  if (!kv) {
    const mem = new Map<string, T>();
    return {
      read: (key) => mem.get(key),
      write: (key, value) => {
        mem.set(key, value);
      },
      delete: (key) => {
        mem.delete(key);
      },
    };
  }
  const store = kv;
  return {
    async read(key) {
      const r = await store.get<T>([prefix, key]);
      return r.value ?? undefined;
    },
    async write(key, value) {
      await store.set([prefix, key], value);
    },
    async delete(key) {
      await store.delete([prefix, key]);
    },
  };
}

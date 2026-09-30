// Тонкий клиент к нашему Supabase-бэкенду. Вся логика Мелио живёт там; бот только
// зовёт эндпоинты и передаёт chat_id. Общий секрет BOT_API_SECRET защищает tg-роуты.
import { config } from "./config.ts";

async function call<T>(route: string, body: unknown): Promise<T> {
  const res = await fetch(`${config.apiBase}/${route}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
      apikey: config.apiKey,
      "x-bot-secret": config.botApiSecret,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${route} → ${res.status}`);
  return await res.json() as T;
}

// Связка Telegram-аккаунта с профилем Melyo по одноразовому токену из deep-link.
export const linkAccount = (token: string, chatId: number) =>
  call<{ status: string; userId?: string; name?: string }>("tg-link", { token, chatId });

// Разговор с Мелио: бэкенд грузит память по chatId, гоняет runMelio и отдаёт ответ.
export const melioChat = (chatId: number, text: string, mode: "chat" | "review" = "chat") =>
  call<{ reply: string; state?: string }>("tg-chat", { chatId, text, mode });

// Активна ли подписка/доступ — для гейтинга премиум-флоу.
export const botEntitlement = (chatId: number) =>
  call<{ active: boolean }>("tg-entitlement", { chatId });

// Продовження підписок по токену картки — логіка на бекенді, бот лише тригерить.
export const renewSubscriptions = (limit = 50) =>
  call<{ processed: number; results: Record<string, number> }>("sub-renew", { limit });

// Проактивные чек-ины: бэкенд возвращает готовые сообщения {chatId, text} к отправке.
export const fetchCheckins = (limit = 50) =>
  call<{ messages: { chatId: number; text: string }[] }>("tg-checkins", { limit });

// ——— Контроль підписника ———
export type Button = { text: string; data?: string; url?: string };
export type Settings = {
  daily_time: string;
  frequency: "daily" | "weekdays" | "3x_week" | "weekly";
  quiet_start: string;
  quiet_end: string;
  weekly_report: boolean;
  nudges_paused_until: string | null;
};
type SubResult = { status: string; reason?: string; accessUntil?: string | null; pauseUntil?: string | null; charged?: boolean; result?: string };

export const fetchDue = (limit = 50) =>
  call<{ messages: { id: string; chatId: number; text: string; buttons: Button[][] | null }[] }>("tg-due", { limit });
export const ackDelivery = (items: { id: string; ok: boolean; error?: string; blocked?: boolean; chatId?: number }[]) =>
  call<{ status: string }>("tg-ack", { items });
export const subStatus = (chatId: number) =>
  call<{ status: string; text?: string; subStatus?: string | null }>("tg-status", { chatId });
export const getSettings = (chatId: number) =>
  call<{ status: string; settings?: Settings }>("tg-settings", { chatId });
export const setSettings = (chatId: number, settings: Record<string, unknown>) =>
  call<{ status: string; settings?: Settings }>("tg-settings", { chatId, settings });
export const subAction = (chatId: number, action: "pause" | "unpause" | "resume" | "cancel", weeks?: number) =>
  call<SubResult>("tg-sub-action", { chatId, action, weeks });
export const memory = (chatId: number, forget?: "history" | "work" | "all") =>
  call<{ status: string; text?: string; empty?: boolean }>("tg-memory", { chatId, forget });
export const cancelFeedback = (chatId: number, reason: string) =>
  call<{ status: string }>("tg-cancel-feedback", { chatId, reason });

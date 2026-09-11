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

// Проактивные чек-ины: бэкенд возвращает готовые сообщения {chatId, text} к отправке.
export const fetchCheckins = (limit = 50) =>
  call<{ messages: { chatId: number; text: string }[] }>("tg-checkins", { limit });

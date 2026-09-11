// Проактивные чек-ины: раз в неделю бэкенд отдаёт готовые сообщения, бот их рассылает.
// Deno Deploy исполняет Deno.cron нативно (Cron jobs включены у приложения).
import { bot } from "./bot.ts";
import { fetchCheckins } from "./api.ts";

// Один прогон рассылки чек-инов. Возвращает число отправленных.
export async function runCheckins(): Promise<number> {
  const { messages } = await fetchCheckins(50);
  let sent = 0;
  for (const m of messages ?? []) {
    try {
      await bot.api.sendMessage(m.chatId, m.text);
      sent++;
    } catch (e) {
      console.error("checkin send:", e instanceof Error ? e.message : String(e));
    }
  }
  console.log(`checkins sent: ${sent}`);
  return sent;
}

// Понедельник 09:00 UTC.
Deno.cron("weekly-checkins", "0 9 * * 1", () => runCheckins());

// Проактивные чек-ины: раз в неделю бэкенд отдаёт готовые сообщения, бот их рассылает.
// Deno Deploy исполняет Deno.cron нативно (Cron jobs включены у приложения).
import { bot } from "./bot.ts";
import { GrammyError } from "grammy";
import { ackDelivery, fetchCheckins, fetchDue, renewSubscriptions } from "./api.ts";
import { fromButtons } from "./keyboards.ts";

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

// Продовження підписок: ганяємо пачками, поки бекенд щось обробляє (стоп-кран — 10 пачок).
export async function runRenewals(): Promise<number> {
  let total = 0;
  for (let i = 0; i < 10; i++) {
    const { processed, results } = await renewSubscriptions(50);
    total += processed;
    console.log(`renewals batch ${i}: ${processed}`, results);
    if (processed < 50) break;
  }
  return total;
}

// Доставка черги: бекенд уже застосував тихі години, ліміти й затухання — тут лише відправка.
export async function runDelivery(): Promise<number> {
  const { messages } = await fetchDue(50);
  const acks: { id: string; ok: boolean; error?: string; blocked?: boolean; chatId?: number }[] = [];
  for (const m of messages ?? []) {
    try {
      await bot.api.sendMessage(m.chatId, m.text, { reply_markup: fromButtons(m.buttons) });
      acks.push({ id: m.id, ok: true });
    } catch (e) {
      const blocked = e instanceof GrammyError && e.error_code === 403;
      acks.push({ id: m.id, ok: false, blocked, chatId: m.chatId, error: e instanceof Error ? e.message : String(e) });
      // 429: решту пачки не женемо — повернуться в чергу після lease.
      if (e instanceof GrammyError && e.error_code === 429) break;
    }
    await new Promise((r) => setTimeout(r, 40)); // < 30 msg/s ліміту Telegram
  }
  if (acks.length) await ackDelivery(acks);
  return acks.filter((a) => a.ok).length;
}

Deno.cron("deliver-notifications", "*/5 * * * *", async () => { await runDelivery(); });

// Щодня 07:00 UTC (10:00 Київ) — вдень списання проходять краще, ніж уночі.
Deno.cron("daily-renewals", "0 7 * * *", async () => { await runRenewals(); });

// Понедельник 09:00 UTC.
Deno.cron("weekly-checkins", "0 9 * * 1", async () => { await runCheckins(); });

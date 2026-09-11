import type { BotContext } from "../bot.ts";
import { linkAccount } from "../api.ts";

// /start [payload]: payload — одноразовый токен из deep-link приложения Melyo.
export async function onStart(ctx: BotContext) {
  const payload = ctx.match?.toString().trim();
  const chatId = ctx.chat?.id;
  if (payload && chatId) {
    try {
      const r = await linkAccount(payload, chatId);
      if (r.status === "ok") {
        ctx.session.linked = true;
        ctx.session.userId = r.userId;
        await ctx.reply(
          `Привет${r.name ? ", " + r.name : ""}! Это Мелио. Теперь я на связи здесь — буду присылать разборы и напоминать о шагах. Что у тебя сейчас в работе?`,
        );
        return;
      }
      console.warn("tg-link вернул статус:", r.status);
    } catch (e) {
      console.error("tg-link ошибка:", e instanceof Error ? e.message : String(e));
      await ctx.reply("Почти получилось, но не вышло подтянуть твой профиль. Попробуй ещё раз кнопкой «Подключить Telegram» в приложении через пару минут.");
      return;
    }
    // payload был, но токен не подошёл (просрочен/использован)
    await ctx.reply("Эта ссылка уже неактуальна. Открой «Подключить Telegram» в приложении ещё раз — сделаю свежую.");
    return;
  }
  await ctx.reply(
    "Привет, я Мелио. Чтобы я подхватил твой профиль, открой меня из приложения Melyo — кнопка «Подключить Telegram».",
  );
}

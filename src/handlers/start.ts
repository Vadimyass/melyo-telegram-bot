import type { BotContext } from "../bot.ts";
import { linkAccount } from "../api.ts";
import { mainMenu } from "../keyboards.ts";

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
          `Привіт${r.name ? ", " + r.name : ""}! Це Меліо. Тепер я на звʼязку тут — надсилатиму розбори й нагадуватиму про кроки. Що в тебе зараз у роботі?`,
          { reply_markup: mainMenu() },
        );
        return;
      }
      console.warn("tg-link вернул статус:", r.status);
    } catch (e) {
      console.error("tg-link ошибка:", e instanceof Error ? e.message : String(e));
      await ctx.reply("Майже вийшло, але не вдалося підтягнути твій профіль. Спробуй ще раз кнопкою «Підключити Telegram» у застосунку за пару хвилин.");
      return;
    }
    // payload был, но токен не подошёл (просрочен/использован)
    await ctx.reply("Це посилання вже неактуальне. Натисни «Підключити Telegram» у застосунку ще раз — зроблю нове.");
    return;
  }
  await ctx.reply(
    "Привіт, я Меліо. Щоб я підхопив твій профіль, відкрий мене із застосунку Melyo — кнопка «Підключити Telegram».",
  );
}

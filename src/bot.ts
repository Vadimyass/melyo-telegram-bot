import { Bot, type Context, session, type SessionFlavor } from "grammy";
import { config } from "./config.ts";
import { initial, kvStorage, type SessionData } from "./session.ts";
import { onStart } from "./handlers/start.ts";
import { onText } from "./handlers/message.ts";
import { onCallback } from "./handlers/callbacks.ts";
import { onReply } from "./handlers/support.ts";
import { onReview } from "./handlers/review.ts";
import { mainMenu } from "./keyboards.ts";
import { runCheckins, runRenewals } from "./cron.ts";
import { onCancel, onMemory, onPauseMenu, onSettings, onStatus } from "./handlers/control.ts";

export type BotContext = Context & SessionFlavor<SessionData>;

export const bot = new Bot<BotContext>(config.botToken);

bot.use(session({
  initial,
  storage: kvStorage<SessionData>(),
  getSessionKey: (ctx) => ctx.chat?.id.toString(),
}));

bot.command("start", onStart);
bot.command("menu", (ctx) => ctx.reply("Чим допомогти?", { reply_markup: mainMenu() }));
bot.command("support", (ctx) => {
  ctx.session.state = "support";
  return ctx.reply("Опиши проблему одним повідомленням — передам команді Melyo, відповімо тобі тут же.");
});
bot.command("review", onReview);
bot.command("reply", onReply);
bot.command("checkins_now", async (ctx) => {
  if (!config.adminChatId || ctx.chat?.id !== config.adminChatId) return;
  const sent = await runCheckins();
  await ctx.reply(`Розіслано чек-інів: ${sent}`);
});
bot.command("renew_now", async (ctx) => {
  if (!config.adminChatId || ctx.chat?.id !== config.adminChatId) return;
  const n = await runRenewals();
  await ctx.reply(`Оброблено підписок: ${n}`);
});
bot.command("cancel", onCancel);
bot.command("status", onStatus);
bot.command("settings", onSettings);
bot.command("pause", onPauseMenu);
bot.command("memory", onMemory);
bot.command("help", (ctx) =>
  ctx.reply(
    "Я Меліо — наставник із бізнес-мислення. Пиши, що в тебе зараз у роботі, кидай пост чи прайс на розбір — допоможу й нагадаю про кроки. Кнопка «Підтримка» або /support — якщо потрібна людина.",
  ));

bot.on("callback_query:data", onCallback);
bot.on("message:text", onText);

bot.catch((err) => console.error("bot error:", err.error));

// Пункты меню-команд в интерфейсе Telegram (идемпотентно, ошибки глотаем).
bot.api.setMyCommands([
  { command: "menu", description: "Меню" },
  { command: "review", description: "Розібрати пост / прайс / шапку" },
  { command: "support", description: "Звʼязатися з підтримкою" },
  { command: "help", description: "Що я вмію" },
  { command: "status", description: "Моя підписка і ліміти" },
  { command: "settings", description: "Час, частота, тихі години" },
  { command: "memory", description: "Що Меліо про мене памʼятає" },
  { command: "pause", description: "Пауза підписки" },
  { command: "cancel", description: "Скасувати підписку" },
]).catch(() => {});

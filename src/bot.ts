import { Bot, type Context, session, type SessionFlavor } from "grammy";
import { config } from "./config.ts";
import { initial, kvStorage, type SessionData } from "./session.ts";
import { onStart } from "./handlers/start.ts";
import { onText } from "./handlers/message.ts";
import { onCallback } from "./handlers/callbacks.ts";
import { onReply } from "./handlers/support.ts";
import { mainMenu } from "./keyboards.ts";
import { runCheckins } from "./cron.ts";

export type BotContext = Context & SessionFlavor<SessionData>;

export const bot = new Bot<BotContext>(config.botToken);

bot.use(session({
  initial,
  storage: kvStorage<SessionData>(),
  getSessionKey: (ctx) => ctx.chat?.id.toString(),
}));

bot.command("start", onStart);
bot.command("menu", (ctx) => ctx.reply("Чем помочь?", { reply_markup: mainMenu() }));
bot.command("support", (ctx) => {
  ctx.session.state = "support";
  return ctx.reply("Опиши проблему одним сообщением — передам команде Melyo, ответят тебе здесь же.");
});
bot.command("reply", onReply);
bot.command("checkins_now", async (ctx) => {
  if (!config.adminChatId || ctx.chat?.id !== config.adminChatId) return;
  const sent = await runCheckins();
  await ctx.reply(`Разослано чек-инов: ${sent}`);
});
bot.command("help", (ctx) =>
  ctx.reply(
    "Я Мелио — наставник по бизнес-мышлению. Пиши, что у тебя сейчас в работе, кидай пост или прайс на разбор — помогу и напомню о шагах. Кнопка «Поддержка» или /support — если нужен человек.",
  ));

bot.on("callback_query:data", onCallback);
bot.on("message:text", onText);

bot.catch((err) => console.error("bot error:", err.error));

// Пункты меню-команд в интерфейсе Telegram (идемпотентно, ошибки глотаем).
bot.api.setMyCommands([
  { command: "menu", description: "Меню" },
  { command: "support", description: "Связаться с поддержкой" },
  { command: "help", description: "Что я умею" },
]).catch(() => {});

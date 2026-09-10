import { Bot, type Context, session, type SessionFlavor } from "grammy";
import { config } from "./config.ts";
import { initial, kvStorage, type SessionData } from "./session.ts";
import { onStart } from "./handlers/start.ts";
import { onText } from "./handlers/message.ts";

export type BotContext = Context & SessionFlavor<SessionData>;

export const bot = new Bot<BotContext>(config.botToken);

bot.use(session({
  initial,
  storage: kvStorage<SessionData>(),
  getSessionKey: (ctx) => ctx.chat?.id.toString(),
}));

bot.command("start", onStart);
bot.command("help", (ctx) =>
  ctx.reply(
    "Я Мелио — наставник по бизнес-мышлению. Пиши, что у тебя сейчас в работе, кидай пост или прайс на разбор — помогу и напомню о шагах.",
  ));

bot.on("message:text", onText);

bot.catch((err) => console.error("bot error:", err.error));

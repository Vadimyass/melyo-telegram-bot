import type { BotContext } from "../bot.ts";
import { melioChat } from "../api.ts";

const HISTORY_CAP = 20;

export async function onText(ctx: BotContext) {
  const text = ctx.message?.text?.trim();
  const chatId = ctx.chat?.id;
  if (!text || !chatId) return;

  if (!ctx.session.linked) {
    await ctx.reply("Сначала подключи меня из приложения Melyo — так я увижу твой разбор и смогу отвечать по делу.");
    return;
  }

  await ctx.replyWithChatAction("typing");
  try {
    const mode = ctx.session.state === "awaiting_artifact" ? "review" : "chat";
    const r = await melioChat(chatId, text, mode);
    ctx.session.state = "idle";
    ctx.session.history.push({ role: "user", content: text }, { role: "melio", content: r.reply });
    if (ctx.session.history.length > HISTORY_CAP) {
      ctx.session.history = ctx.session.history.slice(-HISTORY_CAP);
    }
    await ctx.reply(r.reply);
  } catch (_) {
    await ctx.reply("Что-то заглючило на моей стороне. Попробуй ещё раз через минуту.");
  }
}

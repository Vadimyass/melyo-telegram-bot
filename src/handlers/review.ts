import type { BotContext } from "../bot.ts";
import { melioChat } from "../api.ts";

const PROMPT =
  "Пришли текст поста, прайса или шапки одним сообщением — разберу: что сильно, слабое место и одно важное изменение.";

// /review [текст]: с текстом — разбор сразу (не зависит от сессии); без текста — ждём материал.
export async function onReview(ctx: BotContext) {
  const text = ctx.match?.toString().trim();
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  if (text) {
    await runReview(ctx, chatId, text);
    return;
  }
  ctx.session.state = "awaiting_artifact";
  await ctx.reply(PROMPT);
}

export async function runReview(ctx: BotContext, chatId: number, text: string) {
  ctx.session.state = "idle";
  await ctx.replyWithChatAction("typing");
  try {
    const r = await melioChat(chatId, text, "review");
    await ctx.reply(r.reply);
  } catch (_) {
    await ctx.reply("Не получилось разобрать — попробуй ещё раз через минуту.");
  }
}

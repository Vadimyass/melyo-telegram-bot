import type { BotContext } from "../bot.ts";

// Нажатия кнопок меню.
export async function onCallback(ctx: BotContext) {
  const data = ctx.callbackQuery?.data;
  await ctx.answerCallbackQuery();
  if (data === "ask") {
    ctx.session.state = "idle";
    await ctx.reply("Пиши свой вопрос или что сейчас в работе — отвечу по твоему разбору.");
  } else if (data === "review") {
    ctx.session.state = "awaiting_artifact";
    await ctx.reply("Пришли материал одним сообщением — текст поста, прайса или шапки. Или сразу командой: /review <текст>.");
  } else if (data === "support") {
    ctx.session.state = "support";
    await ctx.reply("Опиши проблему одним сообщением — передам команде Melyo, ответят тебе здесь же.");
  }
}

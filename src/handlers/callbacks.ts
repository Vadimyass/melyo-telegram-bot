import type { BotContext } from "../bot.ts";
import { onControlCallback } from "./control.ts";

// Нажатия кнопок меню.
export async function onCallback(ctx: BotContext) {
  const data = ctx.callbackQuery?.data;
  await ctx.answerCallbackQuery();
  if (data && await onControlCallback(ctx, data)) return;
  if (data === "ask") {
    ctx.session.state = "idle";
    await ctx.reply("Пиши своє питання або що зараз у роботі — відповім з урахуванням твого розбору.");
  } else if (data === "review") {
    ctx.session.state = "awaiting_artifact";
    await ctx.reply("Надішли матеріал одним повідомленням — текст поста, прайсу чи шапки. Або одразу командою: /review <текст>.");
  } else if (data === "support") {
    ctx.session.state = "support";
    await ctx.reply("Опиши проблему одним повідомленням — передам команді Melyo, відповімо тобі тут же.");
  }
}

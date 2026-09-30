import type { BotContext } from "../bot.ts";
import { config } from "../config.ts";

// Пересылка обращения Вадиму + подтверждение пользователю.
export async function forwardToSupport(ctx: BotContext, text: string) {
  const chatId = ctx.chat?.id;
  ctx.session.state = "idle";
  if (config.adminChatId && chatId) {
    const who = ctx.from?.username ? `@${ctx.from.username}` : (ctx.from?.first_name ?? "анонім");
    await ctx.api.sendMessage(
      config.adminChatId,
      `🆘 Підтримка від ${who} (chat ${chatId}):\n\n${text}\n\nВідповісти: /reply ${chatId} <текст>`,
    );
  }
  await ctx.reply("Передав команді. Відповімо тобі тут же — зазвичай протягом дня.");
}

// Ответ поддержки: /reply <chatId> <текст>. Только из админ-чата.
export async function onReply(ctx: BotContext) {
  if (!config.adminChatId || ctx.chat?.id !== config.adminChatId) return;
  const raw = (ctx.match?.toString() ?? "").trim();
  const m = raw.match(/^(\d+)\s+([\s\S]+)$/);
  if (!m) {
    await ctx.reply("Формат: /reply <chatId> <текст>");
    return;
  }
  const target = Number(m[1]);
  try {
    await ctx.api.sendMessage(target, `Відповідь підтримки Melyo:\n\n${m[2]}`);
    await ctx.reply("Надіслано.");
  } catch (e) {
    await ctx.reply(`Не вдалося надіслати: ${e instanceof Error ? e.message : String(e)}`);
  }
}

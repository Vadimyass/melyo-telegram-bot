import type { BotContext } from "../bot.ts";
import { commitNote, melioChat } from "../api.ts";
import { fromButtons } from "../keyboards.ts";
import { forwardToSupport } from "./support.ts";

const HISTORY_CAP = 20;

export async function onText(ctx: BotContext) {
  const text = ctx.message?.text?.trim();
  const chatId = ctx.chat?.id;
  if (!text || !chatId) return;

  // Режим поддержки: следующее сообщение уходит команде, а не Мелио.
  if (ctx.session.state === "support") {
    await forwardToSupport(ctx, text);
    return;
  }

  // «Подключён/нет» — источник правды в Supabase (telegram_links по chatId), а не в
  // эфемерной сессии бота. tg-chat сам вернёт подсказку, если аккаунт не связан.
  // Відповідь на «що завадило / що вийшло» — зберігаємо до кроку і далі говоримо як звичайно:
  // Меліо вже бачить результат у контексті й підбере наступний крок.
  if (ctx.session.state === "awaiting_outcome" && ctx.session.pendingCommitId) {
    const id = ctx.session.pendingCommitId;
    ctx.session.state = "idle";
    ctx.session.pendingCommitId = undefined;
    await commitNote(chatId, id, text).catch(() => {});
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
    await ctx.reply(r.reply, { reply_markup: fromButtons(r.buttons) });
  } catch (_) {
    await ctx.reply("Щось заглючило на моєму боці. Спробуй ще раз за хвилину.");
  }
}

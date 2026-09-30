// Контроль підписника в боті: /status, /settings, /pause, /memory, /cancel і кнопки
// зі сповіщень. Правило: будь-яка дія — один-два тапи, і людина одразу бачить результат.
import { InlineKeyboard } from "grammy";
import type { BotContext } from "../bot.ts";
import { cancelFeedback, commitAction, getSettings, memory, type Settings, setSettings, subAction, subStatus } from "../api.ts";
import { config } from "../config.ts";

const NOT_LINKED = "Акаунт ще не підключено. Відкрий мене із застосунку Melyo кнопкою «Підключити Telegram».";
const TIMES = ["07:00", "08:30", "12:00", "19:00"];
const FREQS: [Settings["frequency"], string][] = [["daily", "Щодня"], ["weekdays", "Будні"], ["3x_week", "3×/тижд"], ["weekly", "1×/тижд"]];
const QUIET: [string, string][] = [["21:00", "08:00"], ["22:00", "09:00"], ["23:00", "10:00"]];
const REASONS: [string, string][] = [
  ["expensive", "Дорого"], ["no_time", "Немає часу"], ["not_useful", "Не допомагає"],
  ["too_many_messages", "Забагато повідомлень"], ["got_what_needed", "Отримав, що хотів"], ["other", "Інше"],
];

const mark = (on: boolean, t: string) => (on ? `✓ ${t}` : t);
const date = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString("uk-UA", { day: "numeric", month: "long" }) : "—");

function settingsKeyboard(s: Settings): InlineKeyboard {
  const kb = new InlineKeyboard();
  for (const t of TIMES) kb.text(mark(s.daily_time === t, t), `set:time:${t}`);
  kb.row();
  for (const [v, l] of FREQS) kb.text(mark(s.frequency === v, l), `set:freq:${v}`);
  kb.row();
  for (const [a, b] of QUIET) kb.text(mark(s.quiet_start === a && s.quiet_end === b, `🌙 ${a.slice(0, 2)}–${b.slice(0, 2)}`), `set:quiet:${a}-${b}`);
  kb.row();
  kb.text(s.weekly_report ? "✓ Звіт у пʼятницю" : "Звіт у пʼятницю: вимкнено", `set:report:${s.weekly_report ? "off" : "on"}`).row();
  const muted = !!s.nudges_paused_until && new Date(s.nudges_paused_until) > new Date();
  kb.text(muted ? `🔕 Тиша до ${date(s.nudges_paused_until)} — увімкнути` : "🔕 Не турбуй 7 днів", `set:mute:${muted ? 0 : 7}`);
  return kb;
}

const SETTINGS_TEXT = "Налаштування Меліо 24/7\n\nЧас тренування, частота, тихі години (у цей час я мовчу, навіть про оплату) і звіт тижня. «Не турбуй» вимикає все, крім повідомлень про гроші й доступ.";

export async function onStatus(ctx: BotContext) {
  const chatId = ctx.chat!.id;
  const r = await subStatus(chatId);
  if (r.status === "not_linked") return ctx.reply(NOT_LINKED);
  const kb = new InlineKeyboard().text("⚙️ Налаштування", "open:settings").text("🧠 Що ти памʼятаєш", "open:memory").row();
  if (r.subStatus === "active") kb.text("Пауза", "sub:pausemenu").text("Скасувати", "sub:cancel").row();
  if (r.subStatus === "paused") kb.text("Зняти паузу", "sub:unpause").row();
  kb.url("Кабінет", `${config.appUrl}/#/cabinet`);
  return ctx.reply(r.text ?? "", { reply_markup: kb });
}

export async function onSettings(ctx: BotContext) {
  const r = await getSettings(ctx.chat!.id);
  if (r.status === "not_linked" || !r.settings) return ctx.reply(NOT_LINKED);
  return ctx.reply(SETTINGS_TEXT, { reply_markup: settingsKeyboard(r.settings) });
}

export function onPauseMenu(ctx: BotContext) {
  const kb = new InlineKeyboard().text("1 тиждень", "sub:pause:1").text("2 тижні", "sub:pause:2").text("Місяць", "sub:pause:4").row().text("Ні, лишаю як є", "noop");
  return ctx.reply("Пауза починається після поточного оплаченого місяця: доступ зараз не зникає, а наступне списання зсувається. Паузу можна брати раз на 3 місяці.", { reply_markup: kb });
}

export async function onMemory(ctx: BotContext) {
  const r = await memory(ctx.chat!.id);
  if (r.status === "not_linked") return ctx.reply(NOT_LINKED);
  const kb = r.empty ? undefined : new InlineKeyboard()
    .text("Забути переписку", "mem:history").text("Забути нотатки", "mem:work").row()
    .text("Забути все", "mem:ask-all");
  return ctx.reply(r.text ?? "", { reply_markup: kb });
}

// /cancel — явна команда, тож скасовуємо одразу. Кнопка зі сповіщення — з підтвердженням,
// щоб випадковий тап не вимкнув підписку.
export async function onCancel(ctx: BotContext) {
  const r = await subAction(ctx.chat!.id, "cancel");
  if (r.status === "not_linked") return ctx.reply(NOT_LINKED);
  if (r.status === "no_subscription") return ctx.reply("Активної підписки немає — списань не буде.");
  const kb = new InlineKeyboard();
  REASONS.forEach(([v, l], i) => { kb.text(l, `cf:${v}`); if (i % 2) kb.row(); });
  if (r.accessUntil) kb.row().text("Ой, відновити підписку", "sub:resume");
  const head = r.accessUntil
    ? `Готово, автосписання вимкнено. Доступ до Меліо 24/7 зберігається до ${date(r.accessUntil)}.`
    : "Готово, підписку скасовано. Списань більше не буде.";
  return ctx.reply(`${head}\n\nЯкщо не складно — одним тапом скажи чому. Це необовʼязково.`, { reply_markup: kb });
}

async function editSettings(ctx: BotContext, patch: Record<string, unknown>) {
  const r = await setSettings(ctx.chat!.id, patch);
  if (!r.settings) return ctx.reply(NOT_LINKED);
  try {
    await ctx.editMessageReplyMarkup({ reply_markup: settingsKeyboard(r.settings) });
  } catch (_) {
    await ctx.reply(SETTINGS_TEXT, { reply_markup: settingsKeyboard(r.settings) });
  }
}

// Повертає true, якщо callback оброблено тут.
export async function onControlCallback(ctx: BotContext, data: string): Promise<boolean> {
  const chatId = ctx.chat?.id;
  if (!chatId) return false;
  const [scope, action, arg] = data.split(":");
  const rest = data.split(":").slice(2).join(":");

  if (data === "noop") return true;
  if (scope === "open") {
    if (action === "settings") await onSettings(ctx);
    else if (action === "status") await onStatus(ctx);
    else if (action === "memory") await onMemory(ctx);
    return true;
  }
  if (scope === "set") {
    if (action === "time") await editSettings(ctx, { daily_time: rest });
    else if (action === "freq") await editSettings(ctx, { frequency: arg });
    else if (action === "quiet") { const [a, b] = rest.split("-"); await editSettings(ctx, { quiet_start: a, quiet_end: b }); }
    else if (action === "report") await editSettings(ctx, { weekly_report: arg === "on" });
    else if (action === "mute") await editSettings(ctx, { pause_nudges_days: Number(arg) });
    return true;
  }
  if (scope === "sub") {
    if (action === "pausemenu") { await onPauseMenu(ctx); return true; }
    if (action === "cancel" && arg !== "yes") {
      const kb = new InlineKeyboard().text("Так, вимкнути автосписання", "sub:cancel:yes").row().text("Пауза замість скасування", "sub:pausemenu").row().text("Ні, лишаю", "noop");
      await ctx.reply("Вимкнути автосписання? Доступ збережеться до кінця оплаченого місяця.", { reply_markup: kb });
      return true;
    }
    if (action === "cancel") { await onCancel(ctx); return true; }
    const r = await subAction(chatId, action as "pause" | "unpause" | "resume", Number(arg) || undefined);
    if (r.status === "not_linked") await ctx.reply(NOT_LINKED);
    else if (r.status === "not_allowed") await ctx.reply(r.reason ?? "Зараз це недоступно.");
    else if (action === "pause" && r.status === "ok") {
      // Підтвердження з датами прийде окремим сповіщенням (черга), тут — коротка реакція.
      await ctx.reply(`Пауза до ${date(r.pauseUntil)} ✅ До ${date(r.accessUntil)} все працює як зараз.`);
    } else if (action === "unpause") {
      await ctx.reply(r.charged ? (r.result === "success" ? "Паузу знято, Меліо 24/7 знову активна ✅" : "Паузу знято. Оплата обробляється — щойно пройде, напишу.") : "Паузу скасовано — все продовжиться як звичайно.");
    } else if (action === "resume") {
      await ctx.reply(r.status === "ok" ? "Підписку відновлено ✅ Автосписання увімкнено." : "Нічого відновлювати — підписка вже активна або завершилась. Деталі: /status");
    }
    return true;
  }
  if (scope === "mem") {
    if (action === "ask-all") {
      const kb = new InlineKeyboard().text("Так, забути все", "mem:all").text("Ні", "noop");
      await ctx.reply("Забуду все, що дізнався з наших розмов (результат діагностики лишиться). Поради стануть загальнішими, поки знову не розкажеш про бізнес.", { reply_markup: kb });
      return true;
    }
    if (action === "history" || action === "work" || action === "all") {
      await memory(chatId, action);
      ctx.session.history = [];
      await ctx.reply(action === "all" ? "Готово, все забув." : action === "history" ? "Переписку забув." : "Нотатки про справи забув.");
    }
    return true;
  }
  if (scope === "cm") {
    // Прибираємо кнопки, щоб подвійний тап не записав результат двічі.
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
    const r = await commitAction(chatId, arg, action);
    if (r.status === "not_linked") await ctx.reply(NOT_LINKED);
    else if (r.status === "stale") await ctx.reply("Цей крок уже закрито — все збережено.");
    else if (r.status === "not_found") await ctx.reply("Не знайшов цей крок. Напиши, над чим зараз працюєш — підберемо новий.");
    else if (r.reply) {
      await ctx.reply(r.reply);
      if (r.awaitNote) {
        ctx.session.state = "awaiting_outcome";
        ctx.session.pendingCommitId = arg;
      }
    }
    return true;
  }
  if (scope === "cf") {
    await cancelFeedback(chatId, action);
    const extra = action === "too_many_messages"
      ? "\n\nДо речі, частоту можна зменшити до разу на тиждень або ввімкнути «Не турбуй» — /settings."
      : "";
    await ctx.reply(`Дякую, це допоможе зробити Меліо кращим.${extra}`);
    return true;
  }
  return false;
}

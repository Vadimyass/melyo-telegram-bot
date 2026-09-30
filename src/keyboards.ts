import { InlineKeyboard } from "grammy";
import { config } from "./config.ts";
import type { Button } from "./api.ts";

// Кнопки з бекенду ([[{text, data|url}]]) → inline-клавіатура Telegram.
export function fromButtons(rows?: Button[][] | null): InlineKeyboard | undefined {
  if (!rows?.length) return undefined;
  const kb = new InlineKeyboard();
  for (const row of rows) {
    for (const b of row) b.url ? kb.url(b.text, b.url) : kb.text(b.text, b.data ?? "noop");
    kb.row();
  }
  return kb;
}

// Главное меню бота: спросить Мелио, поддержка, открыть приложение.
export function mainMenu(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Запитати Меліо", "ask").row()
    .text("Розібрати матеріал", "review").row()
    .text("Підтримка", "support").row()
    .url("Відкрити Melyo", config.appUrl);
}

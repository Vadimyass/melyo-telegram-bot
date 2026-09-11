import { InlineKeyboard } from "grammy";
import { config } from "./config.ts";

// Главное меню бота: спросить Мелио, поддержка, открыть приложение.
export function mainMenu(): InlineKeyboard {
  return new InlineKeyboard()
    .text("Спросить Мелио", "ask").row()
    .text("Поддержка", "support").row()
    .url("Открыть Melyo", config.appUrl);
}

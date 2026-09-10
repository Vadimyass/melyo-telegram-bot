# Melyo Telegram Bot

Тонкий разговорный слой Мелио в Telegram. Вся логика наставника (память, режимы
lesson/review/reassess) живёт в Supabase-бэкенде Melyo; бот только принимает апдейты
и дёргает бэкенд как API.

- Фреймворк: [grammY](https://grammy.dev) (Deno)
- Рантайм: Deno Deploy, режим **webhook** (serverless, без always-on процесса)
- Сессии: Deno KV (встроено в Deno Deploy)
- Стоимость инфраструктуры: $0 на старте (free-tier Deno Deploy)

## Структура

```
src/
  main.ts            вход: Deno.serve + webhookCallback (/webhook)
  bot.ts             сборка Bot, session-middleware, команды
  config.ts          переменные окружения
  api.ts             клиент к Supabase-бэкенду (tg-link, tg-chat, tg-entitlement)
  session.ts         состояние диалога на чат (Deno KV)
  handlers/
    start.ts         /start + связка аккаунта по deep-link
    message.ts       текст → диалог с Мелио
scripts/
  set-webhook.ts     разовая привязка вебхука к деплою
```

## Переменные окружения

Скопируй `.env.example` → `.env` (локально) или задай в настройках Deno Deploy:

| Переменная | Что это |
|---|---|
| `BOT_TOKEN` | токен бота от @BotFather |
| `MELYO_API_BASE` | `https://<project>.supabase.co/functions/v1/api` |
| `MELYO_API_KEY` | supabase anon key |
| `BOT_API_SECRET` | общий секрет с бэкендом (заголовок `x-bot-secret`) |
| `WEBHOOK_SECRET` | секрет проверки вебхука Telegram |

## Локальный запуск

```bash
deno task dev
```

## Деплой (Deno Deploy)

1. Создай проект на dash.deno.com, подключи этот GitHub-репозиторий, entrypoint — `src/main.ts`.
2. Пропиши переменные окружения в настройках проекта.
3. После деплоя привяжи вебхук:

```bash
deno task setwebhook https://<твой-проект>.deno.dev/webhook
```

## Зависимость от бэкенда

Бот ждёт на стороне Melyo-бэкенда три роута (проверяют `x-bot-secret`):

- `POST tg-link` `{ token, chatId }` → `{ status, userId, name }` — связка по deep-link
- `POST tg-chat` `{ chatId, text, mode }` → `{ reply, state }` — реплика Мелио (грузит память по chatId)
- `POST tg-entitlement` `{ chatId }` → `{ active }` — активна ли подписка

Deep-link для подключения из приложения: `https://t.me/<bot_username>?start=<one-time-token>`.

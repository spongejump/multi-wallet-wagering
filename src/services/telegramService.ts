import { Telegraf, Context } from "telegraf";
import {
  TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID,
  THREAD_ID,
} from "../config/constants";

// Define session type for wallet creation only
interface WalletCreationSession {
  isCreatingWallet?: boolean;
  telegramId?: string;
}

// Extend Context type to include our session
interface WalletContext extends Context {
  session: WalletCreationSession;
}

export const bot = new Telegraf<WalletContext>(TELEGRAM_BOT_TOKEN);

export async function sendTelegramMessage(message: string, photo?: string) {
  if (photo) {
    return bot.telegram.sendPhoto(TELEGRAM_CHAT_ID, photo, {
      caption: message,
      parse_mode: "Markdown",
      ...(THREAD_ID ? { message_thread_id: THREAD_ID } : {}),
    });
  }

  return bot.telegram.sendMessage(TELEGRAM_CHAT_ID, message, {
    parse_mode: "Markdown",
    ...(THREAD_ID ? { message_thread_id: THREAD_ID } : {}),
  });
}
